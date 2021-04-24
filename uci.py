import chess
import random

# TODO 

def uci(msg: str, board: chess.Board, depth = 1: int):    
    """
    Accept UCI commands and respond.
    The board state is also updated.
    """

    if msg == "quit":
        sys.exit()

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

    if "position startpos moves" in msg:
        moves = msg.split(" ")[3:]
        board.clear()
        board.set_fen(chess.STARTING_FEN)
        for move in moves:
            board.push(chess.Move.from_uci(move))
        return

    if "position fen" in msg:
        fen = " ".join(msg.split(" ")[2:])
        board.set_fen(fen)
        return

    if msg[0:2] == "go":
        #_move = next_move(depth, board)
        #moves = list(board.legal_moves)
        #move = random.choice(moves)
        move = search(board, depth, 0)
        board.push(move)
        #print(f"bestmove {_move}")
        print(f"bestmove {move}")
        return        