import chess
import random
#from negamax import search
from parallel import search
from log import log

# TODO Teach engine to play both white and black sides

def command(msg: str, board: chess.Board, defaultDepth: int, maxDepth: int):    
    """
    Accept UCI commands and respond.
    The board state is also updated.
    """

    if msg == "quit":
        log("\n[KAISSA64] Session was ended...")        
        return

    if msg == "uci":
        print("id name Kaissa64")  
        print("id author Serge Gotsuliak")
        print("uciok")
        return

    if msg == "isready":
        print("readyok")
        return

    if msg == "ucinewgame":
        # TODO ...
        return

    # TODO Use chess.parse_uci()
    if "position startpos moves" in msg:
        moves = msg.split(" ")[3:]
        board.clear()
        board.set_fen(chess.STARTING_FEN)
        for move in moves:
            #log(f"... board.push {move}")
            board.push(chess.Move.from_uci(move))
        return

    # Game started and we play whites
    if msg == "position startpos":
        log(f"... clear board")
        board.clear()
        board.set_fen(chess.STARTING_FEN)
        return

    if "position fen" in msg:
        fen = " ".join(msg.split(" ")[2:])
        board.set_fen(fen)
        # TODO Duplcation with [go] part
        log(f"... searching with depth {defaultDepth}/{maxDepth}")
        #score, move = search(board, board.turn, depth, returnMove = True) 
        
        #move, score, count = search(board, board.turn, defaultDepth, -10000, 10000)    
        move, score, count = search(board, board.turn, defaultDepth, maxDepth)    
        
        log(f"... push move {move} => {score}")
        board.push(move)
        log(f"<<< bestmove {move}")
        print(f"bestmove {move}")        
        return                        

    if msg[0:2] == "go":
        log(f"... searching with depth {defaultDepth}/{maxDepth}")
        #score, move = search(board, board.turn, depth, returnMove = True)        
        
        move, score, count = search(board, board.turn, defaultDepth, maxDepth)  
        
        log(f"... push move {move} => {score}")
        board.push(move)
        log(f"<<< bestmove {move}")
        print(f"bestmove {move}")        
        return        