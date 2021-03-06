import chess
import random
from evaluate import evaluate
#import copy
#import os
#import psutil
from multiprocessing import Pool

count = 0

# TODO Learn about castling properly!
# TODO Eliminate 3-fold repetition! See code of main.py
# TODO Implement time constraints to avoid "Black forfeits on time"

def search(board: chess.Board, turn: bool, depth: int, alpha: int = -10000, beta: int = 10000, returnMove: bool = False, returnCount: bool = False, tree: str = ""):
    
    # Lets count all nested calls for search within current move
    global count
    count = 0 if returnCount else count + 1    

    # Just return evaluation for terminal nodes  
    # TODO Check for game_over ONLY if there None move was returned!  
    if depth == 0 or board.is_game_over():               
        return evaluate(board, turn)

    bestMove = None

    for move in board.legal_moves:      

        # TODO Mate in ply! Move to eval function as special heuristic?        
#        capturedPiece = board.piece_type_at(move.to_square)        
#        if capturedPiece == chess.KING:
#            return 10000 - board.ply()   

#        if board.gives_check(move):
#            score = -(10000 - board.ply())
#            print("=== GIVES CHECK :", move, "|", score, "===")
        
        board.push(move)        
        treeBefore = tree
        tree += move.uci() + " > "         
#        score = -search(board, not turn, depth-1, -beta, -alpha, tree = tree)
        # We should see immediate checks
        if board.is_checkmate():            
            score = 10000 - board.ply()
            #if board.ply() < 111:
            #    score = -(10000 - board.ply())
            #else:
                #score = 10000 - board.ply()
            #if returnMove:
            #    print("=== MOVE IN IMMEDIATE CHECK :", move, "|", score, "===")
            #if returnMove:
            #    print("=== MOVE IN CHECK ", tree, "|", score, "===")
        else:                
            score = -search(board, not turn, depth-1, -beta, -alpha, tree = tree)
        tree = treeBefore            
        board.pop()                            

        if score > alpha: 
            #print (tree + move.uci(), "| score > alpha |", score, ">", alpha)
            # TODO Should look for order of later assignments and beta check
            alpha = score
            bestMove = move   

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
            #    print ("BETA |", beta, "- DEPTH |", depth-1)                
                if returnMove and returnCount:   
                    return beta, bestMove, count
                elif returnMove:
                    return beta, bestMove
                else:
                    return beta
                                          
    if returnMove and returnCount:
        return alpha, bestMove, count
    elif returnMove:
        return alpha, bestMove
    else:    
        return alpha
