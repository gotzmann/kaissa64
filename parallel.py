import chess
from evaluate import evaluate
import copy
from multiprocessing import Process, Queue, Value

# TODO Learn about castling properly!
# TODO Eliminate 3-fold repetition! See code of main.py
# TODO Implement time constraints to avoid "Black forfeits on time"

# How many CPU cores should we use?
cores = 6

# Total count of nested calls within current ply
count = 0

# Workers stays in memory till the programm end
workers = []

# Sharing Alpha between Processes
sharedAlpha = Value('i', -10000)

inq = Queue()
outq = Queue()


def startWorkers():    
    workers = [ 
        Process(target = worker, args = (inq, outq, sharedAlpha))        
            for _ in range(cores)
    ]        
    for w in workers: w.start() # TODO ??? w.Daemon = True
    
def stopWorkers():
    for _ in range(cores): inq.put(None)    

def search(board: chess.Board, turn: bool, depth: int, alpha: int = -10000, beta: int = 10000):

    global count; count = 0    
    results = []    

    # Init global Alpha before starting pushing into queues
    with sharedAlpha.get_lock():
        sharedAlpha.value = -10000
    
    # What was the last BEST move?
#    if board.ply() > 1:
 #       theBoard = copy.copy(board)
  #      theBoard.pop()
   #     wasBest = theBoard.pop().uci()
        #print("WAS BEST", wasBest)
#    else:
 #       wasBest = None    

    # Create queue of jobs for different workers
    moves  = list(board.legal_moves)
    for move in moves:        
        newBoard = copy.copy(board)
        newBoard.push(move)
        # Search previous best move deeper than others
#        if move.uci() == wasBest: 
            #print("WAS BEST", move, "+2")
 #           inq.put( (newBoard, turn, depth + 2, alpha, beta) )
  #      else:    
        inq.put( (newBoard, turn, depth, alpha, beta) )

    bestMove = None
    bestScore = -10000

    # Get all results
    # TODO Break by time-out and do more reliable processing here
    count = 0
    while True:        
        move, score = outq.get()
        if score > bestScore:
            bestScore = score
            bestMove = move
        count += 1    
        #print("===", move, "=>", score, " | BEST", bestMove)                
        if count == len(moves): break

    return bestMove, bestScore, count    

def negamax(board: chess.Board, turn: bool, depth: int, alpha: int, beta: int):

    # Lets count all nested calls for search within current move
    # TODO Mutex to avoid data races
    global count; count += 1    

    # Just return evaluation for terminal nodes  
    # TODO Check for game_over ONLY if there None move was returned!  
    if depth == 0 or board.is_game_over():               
        return evaluate(board, turn)

    """
    # We should get last move from the top of the board to compute check/mate situation correctly
    move = board.pop()

    # Heuristic to valuate the MATE move    
    if board.gives_check(move):            
        board.push(move)  
        if board.is_checkmate():      
            score = -(10000 - board.ply())
            print("TOP MATE", move, score)
            return score
        else:    
            board.pop()

    # Heuristic to valuate the CHECK move    
    if board.gives_check(move):            
        score = -(9000 - board.ply())        
        print("TOP CHECK", move, score)
        board.push(move)        
        return score

    # Return board to the initial state
    board.push(move)        
    """
    # Check all moves one by one
    for move in board.legal_moves:      
    
        board.push(move)        
#        treeBefore = tree
#        tree += move.uci() + " > "             
        score = -negamax(board, turn, depth-1, -beta, -alpha)              
        board.pop() # TODO What if do not pop?

        if score > alpha:             
            # TODO Should look for order of later assignments and beta check
            alpha = score

            # Print board for "root" moves
            #if returnMove:
            #    print("\n---------------")                   
            #    print(f"MAX", "WHITE" if board.turn else "BLACK", move, "=>", score)
            #    print("---------------")   
            #    board.push(move)
            #    print(board)
            #    board.pop()            
            #    print("---------------")   

            if score >= beta:             
                return beta
                                          
    return alpha

def worker(inq: Queue, outq: Queue, sharedAlpha: Value):

    while True:

        args = inq.get()        
        if args is None: break # Stop worker    

        board, turn, depth, alpha, beta = args

        with sharedAlpha.get_lock():
            alpha = max(alpha, sharedAlpha.value)                                    

        score = -negamax(board, turn, depth-1, -beta, -alpha)   

        with sharedAlpha.get_lock():
            if score > sharedAlpha.value:
                sharedAlpha.value = score
                ##if score >= beta: # TODO Is it ever possible?
                ##    outq.put( (board.peek(), beta) )

        #print(board.peek(), "=>", score, " | ", alpha, " .. ", beta)

        # Return bestMove and bestScore
        outq.put( (board.peek(), score) )
