  /*******************************************\
    =========================================
              PIECE COLOR ENCOIDING
    =========================================
      
      White = 8 
      Black = 16

    =========================================
               PIECE TYPE ENCODING
    =========================================
    
      emSq,  P+, P-, K,  N,  B,  R,  Q
         0,  1,  2,  3,  4,  5,  6,  7
    
    =========================================
                 PIECE ENCODING
    =========================================
    
     wP : P+| w = 9     0001 | 1000 = 1001
     wK : K | w = 11    0011 | 1000 = 1011
     wN : N | w = 12    0100 | 1000 = 1100
     wB : B | w = 13    0101 | 1000 = 1101
     wR : R | w = 14    0110 | 1000 = 1110
     wQ : Q | w = 15    0111 | 1000 = 1111
    
     bP : P-| b = 18   00010 | 10000 = 10010
     bK : K | b = 19   00011 | 10000 = 10011
     bN : N | b = 20   00100 | 10000 = 10100
     bB : B | b = 21   00101 | 10000 = 10101
     bR : R | b = 22   00110 | 10000 = 10110
     bQ : Q | b = 23   00111 | 10000 = 10111

  \*******************************************/

  // 0x88 board + positional scores
  var board = [
    22, 20, 21, 23, 19, 21, 20, 22,    0,  0,  5,  5,  0,  0,  5,  0, 
    18, 18, 18, 18, 18, 18, 18, 18,    5,  5,  0,  0,  0,  0,  5,  5,
     0,  0,  0,  0,  0,  0,  0,  0,    5, 10, 15, 20, 20, 15, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,    5, 10, 20, 30, 30, 20, 10,  5,    
     0,  0,  0,  0,  0,  0,  0,  0,    5, 10, 20, 30, 30, 20, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,    5, 10, 15, 20, 20, 15, 10,  5,
     9,  9,  9,  9,  9,  9,  9,  9,    5,  5,  0,  0,  0,  0,  5,  5,
    14, 12, 13, 15, 11, 13, 12, 14,    0,  0,  5,  5,  0,  0,  5,  0
  ];

  // unicode characters to represent pieces on board
  var pieces = [
    //           bP            bK        bN        bB        bR        bQ
    "", "", "\u265F",      "\u265A", "\u265E", "\u265D", "\u265C", "\u265B",
    
    //           wP            wK        wN        wB        wR        wQ 
    "",      "\u2659", "", "\u2654", "\u2658", "\u2657", "\u2656", "\u2655"

  ];

  // Relative values to evaluate the material score of the position
  var pieceWeights = [
    //     bP       bK  bN    bB    bR    bQ
    0, 0, -100,     0, -300, -350, -500, -900,
    
    //     wP       wK  wN    wB    wR    wQ
    0,     100, 0,  0,  300,  350,  500,  900
  ];

  // piece move offsets
  var moveOffsets = [

     15,  16,  17,   0,                           // black pawns
    -15, -16, -17,   0,                           // white pawns
      1,  16,  -1, -16,   0,                      // rooks
      1,  16,  -1, -16,  15, -15, 17, -17,  0,    // queens, kings and bishops
     14, -14,  18, -18,  31, -31, 33, -33,  0,    // knights
      3,  -1,  12,  21,  16,   7, 12              // starting indexes for every piece type
  ];

  // side to move
  var sideToMove = 8;
  
  // board orientation
  var flip = 0;

  // to store the best move found in search
  var bestSourceSquare, bestTargetSquare;
  
  // pseudo legal moves for validation and highlighting
  var pseudoLegalMoves = [];

  // variable to check click-on-piece state
  var clickLock = false;

  // user input variables
  var userSourceSquare, userTargetSquare;

  // default search depth
  var searchDepth = 3;
  
  // search ply
  var ply = 0;

  /******************************\
   ==============================

               ENGINE

   ==============================
  \******************************/

  var count = 0

  // search board position for the best move
  function search(sideToMove, alpha, beta, depth, validate = false, hide = 0, returnMove = false) {

    if (returnMove) count = 0; else count++
    
    // we are in the leaf node
    if (depth == 0) {
      // static evaluation score
      let score = 0;

      // loop over board squares
      for (var square = 0; square < 128; square++) {
        // make sure square is on board
        if ((square & 0x88) == 0) {
          // init piece
          let piece = board[square]
          
          // make sure square contains a piece
          if (piece) {
            // calculate material score
            score += pieceWeights[piece & 15];
            
            // calculate positional score
            (piece & 8) ? (score += board[square + 8]) : (score -= board[square + 8]);
          }
        }
      }

      // return positive score for white and negative for black
      return (sideToMove == 8) ? score: -score;
    }

    //console.log("--- [ ", depth, " ] --- #", count)
    if (!hide) console.log("--- [", depth, "] ---")

/////    var oldAlpha = alpha;       // needed to check whether to store best move or not
    var tempBestSourceSquare;   // temorary best from square
    var tempBestTargetSquare;   // temporary best to square
    //var score = -10000;         // minus infinity
    var score;         // minus infinity

    //var max = -10000; // gotz

    // move generator variables
    var sourceSquare, targetSquare, capturedSquare, capturedPiece;
    var piece, pieceType, directions, stepVector;
    
    // loop over board squares
    for (var square = 0; square < 128; square++) {
      // make sure that square is on board
      if ((square & 0x88) == 0) {
        // init source square
        sourceSquare = square
      
        // init piece to move
        piece = board[square];
        
        // make sure piece belongs to the sideToMove to move
        if (piece & sideToMove) {
          // extract piece type
          pieceType = piece & 7;
          
          // init directions
          directions = moveOffsets[pieceType + 30];
          
          // loop over piece move directions
          while(stepVector = moveOffsets[++directions]) {   // loop over move offsets
            // init target square
            targetSquare = sourceSquare;
            
            // loop over squares within a given move direction ray
            do {
              // init next target square within move direction ray
              targetSquare += stepVector;
              
              // init captured piece
              capturedSquare = targetSquare;
              
              // drop sliding if hit the edge of the board
              if(targetSquare & 0x88) break;
              
              // init captured piece
              capturedPiece = board[capturedSquare];
              
              // break if captured own piece
              if(capturedPiece & sideToMove) break;
              
              // pawns captures only diagonally
              if(pieceType < 3 && !(stepVector & 7) != !capturedPiece) break;
              
              // return mating score if king has been captured
              if((capturedPiece & 7) == 3) return 10000 - ply; // mate in "ply"
              
              // validate moves
              if (validate) pseudoLegalMoves.push([sourceSquare, targetSquare]);
              
              // make move
              board[capturedSquare] = 0;       // clear captured square
              board[sourceSquare] = 0;         // clear source square (from square where piece was)
              board[targetSquare] = piece;     // put piece to destination square (to square)

              // pawn promotion
              if(pieceType < 3) {   // if pawn
                if(targetSquare + stepVector + 1 & 0x80)    // goes to the 1th/8th rank
                  board[targetSquare] |= 7;                 // convert it to queen
              }

              // recursive negamax search call
              ply++
              //score = -search(24 - sideToMove, -beta, -alpha, depth - 1);                            
              score = -search(24 - sideToMove, -beta, -alpha, depth - 1, false, true);                            
              ply--;

              // --- Gotz BEGIN ---

              files = "ABCDEFGH"              
              rows  = "87654321"
              color = (24 - sideToMove) == 8 ? "WHITE" : "BLACK"
              pieceName = [ "", "PAWN", "PAWN", "KING", "KNIGHT", "BISHOP", "ROOK", "QUEEN" ]

              if (!hide)
              console.log(              	
              	color, "MOVE", depth-1, "|", pieceName[piece & 7], 
              	files[sourceSquare - Math.floor(sourceSquare / 16) * 16] + rows[Math.floor(sourceSquare / 16)], 
              	files[targetSquare - Math.floor(targetSquare / 16) * 16] + rows[Math.floor(targetSquare / 16)], 
              	"=>", score);

              // --- Gotz END --- 
              
              // take back
              board[targetSquare] = 0;                   // clear the destination square (to square)
              board[sourceSquare] = piece;               // put the piece back to it's original square
              board[capturedSquare] = capturedPiece;     // restore captured piece on source square
              
              //Needed to detect checkmate
              bestSourceSquare = sourceSquare;
              bestTargetSquare = targetSquare;
/*
              // gotz
              if (score > max) {
                max = score
                tempBestSourceSquare = sourceSquare;
                tempBestTargetSquare = targetSquare;
                if (returnMove) {
                  console.log("MAX |", uci(sourceSquare, targetSquare), "=>", max)
                }
              }  
*/
              
              // Found better move (PV node)
              if(score > alpha) {
                // move is good enough to drop the branch (fail-high node)
                if(score >= beta) {                  
                  if (returnMove) 
                    return { "score": beta, "source": tempBestSourceSquare, "target": tempBestTargetSquare }                    
                  else
                    return beta
                }    
                
                // update alpha value
                alpha = score;

                // save best move in given branch
                tempBestSourceSquare = sourceSquare;
                tempBestTargetSquare = targetSquare;

                // gotz
                if (returnMove) {
                  console.log("MAX |", uci(sourceSquare, targetSquare), "=>", alpha)
                }

              }   
                            
              // fake capture for non-slider pieces
              capturedPiece += pieceType < 5;
              
              // unfake capture for pawns if double pawn push is on the cards
              if(pieceType < 3 & 6*sideToMove + (targetSquare & 0x70) == 0x80) capturedPiece--;
            }
            
            // condition to break out of loop over squares for non-slider pieces
            while(capturedPiece == 0)
          }
        }
      }
    }
    
    // associate best score with best move
/////    if(alpha != oldAlpha) {
        bestSourceSquare = tempBestSourceSquare;
        bestTargetSquare = tempBestTargetSquare;
/////    } 

    // didn't find a better move (fail-low node)
/////    return alpha;
/*
    if (returnMove) 
      return alpha, bestSourceSquare, bestTargetSquare
    else
      return alpha
*/
    if (returnMove) 
      //return max, bestSourceSquare, bestTargetSquare
      return { "score": alpha, "source": bestSourceSquare, "target": bestTargetSquare }
    else
      return alpha
      
  }


  /******************************\
   ==============================

                GUI

   ==============================
  \******************************/

  // handle user input
  function makeUserMove(sq) {
    // convert div ID to square index
    var clickSquare = parseInt(sq, 10)
    
    // if user clicks on source square 
    if(!clickLock && board[clickSquare]) {
      // remove previous highlighting
      for (let square = 0; square < 128; square++)
        if ((square & 0x88) == 0)
          document.getElementById(square).classList.remove('highlight');
      
      // highlight current square
      document.getElementById(clickSquare).classList.add('highlight');
    
      // reset move list
      pseudoLegalMoves = [];
      
      // validate moves
      search(sideToMove, -10000, 10000, 1, true, true);
      
      // highlight pseudo legal moves
      for (let moveIndex = 0; moveIndex < pseudoLegalMoves.length; moveIndex++)
        if (clickSquare == pseudoLegalMoves[moveIndex][0])
            document.getElementById(pseudoLegalMoves[moveIndex][1]).classList.add('highlight');

      // init user source square
      userSourceSquare = clickSquare;
      
      // lock click
      clickLock ^= 1;
    }
    
    // if user clicks on destination square
    else if(clickLock) {
      // deep copy board position
      let boardCopy = JSON.stringify(board);

      // extract row and column from target square
      var col = userSourceSquare & 7;
      var row = userSourceSquare >> 4;
      
      // move user piece
      board[clickSquare] = board[userSourceSquare];
      board[userSourceSquare] = 0;
      
      // if pawn promotion
      if(((board[clickSquare] == 9) && (clickSquare >= 0 && clickSquare <= 7)) ||
         ((board[clickSquare] == 18) && (clickSquare >= 112 && clickSquare <= 119)))
          board[clickSquare] |= 7;    // convert pawn to corresponding sideToMove's queen
      
      // change sideToMove
      sideToMove = 24 - sideToMove;
      
      // unlock click
      clickLock ^= 1;
      
      // legality checking
      if (clickSquare == userSourceSquare ||
          document.getElementById(clickSquare).classList.value != 'highlight' ||
          search(sideToMove, -10000, 10000, 2, true, true) == Math.abs(10000)) {
        takeUserMoveBack(boardCopy);
        return;
      }
      
      // update position
      drawBoard();
      
      // highlight last move
      document.getElementById(clickSquare).classList.add('highlight');
      
      // make computer move in response
      setTimeout(function() { makeEngineMove(searchDepth) }, 100);
    }
  }

  // take user move back if illegal
  function takeUserMoveBack(boardCopy) {
    // restore board position
    board = JSON.parse(boardCopy);
    
    // change sideToMove
    sideToMove = 24 - sideToMove;
    
    // remove previous highlighting
    for (let square = 0; square < 128; square++)
      if ((square & 0x88) == 0)
        document.getElementById(square).classList.remove('highlight');    
  }

  // handle engine output
  function makeEngineMove(depth) {
    // search position
    /////var score = search(sideToMove, -10000, 10000, depth, false, true);
    //score, source, target = search(sideToMove, -10000, 10000, depth, false, true, true);
    var ret = search(sideToMove, -10000, 10000, depth, false, true, true);

    source = ret.source
    target = ret.target
    score = ret.score
    bestTargetSquare = ret.source
    bestTargetSquare = ret.target
    //console.log(score, source, target)

    console.log("BEST #", ply, "|", uci(source, target), "of", count, "=>", score)

    // Black checkmate detection
    if(score <= -9999) {
      // update board view
      drawBoard();
      
      // highlight king square
      for (let square = 0; square < 128; square++)
        if (board[square] == 19)
          document.getElementById(square).classList.add('mate');
      
      // no more moves to make
      return;
    }
    
    // move engine piece
    board[bestTargetSquare] = board[bestSourceSquare];
    board[bestSourceSquare] = 0;
    
    // if pawn promotion
    if(((board[bestTargetSquare] == 9) && (bestTargetSquare >= 0 && bestTargetSquare <= 7)) ||
       ((board[bestTargetSquare] == 18) && (bestTargetSquare >= 112 && bestTargetSquare <= 119)))
        board[bestTargetSquare] |= 7;    // convert pawn to corresponding sideToMove's queen
    
    // change sideToMove
    sideToMove = 24 - sideToMove;
    
    // White checkmate detection
    if(score >= 9998) {
      // update board view
      drawBoard();
      
      // highlight last move
      document.getElementById(bestTargetSquare).classList.add('highlight');
      
      // highlight king square
      for (let square = 0; square < 128; square++)
        if (board[square] == 11)
          document.getElementById(square).classList.add('mate');
      
      // no more moves to make
      return;
    }
        
    else {
      // update board view
      drawBoard();
      
      //////console.log("bestTargetSquare = ", bestTargetSquare)
      // highlight last move
      document.getElementById(bestTargetSquare).classList.add('highlight');
    }  
  }

  // update board view
  function drawBoard() {
    // create HTML table tag (disable text selection, adjust mouse pointer)
    var chessBoard = `<table bgcolor="#996633"
                             align="center"
                             cellspacing="1"
                             style="
                          -moz-user-select: none;
                       -webkit-user-select: none;
                           -ms-user-select: none;
                               user-select: none;
                            -o-user-select: none;
                                    border: 10px solid #996633;"
                             unselectable="on"
                             onselectstart="return false;"
                             onmousedown="return false;"`;

    // loop over board rows
    for (var row = 0; row < 8; row++) {     
      // create table row
      chessBoard += '<tr>'
      
      // loop over board columns
      for (var col = 0; col < 16; col++) {
        // custom file and rank for board flipping
        var file, rank;
        
        // flip board view
        if (flip) {
          file = 16 - 1 - col;
          rank = 8 - 1 - row;
        } else {
          file = col;
          rank = row;
        }

        // init square
        var square = rank * 16 + file;
        
        // make sure square is on board
        if ((square & 0x88) == 0)
          // create table cell
          chessBoard += '<td align="center" id="' + square + 
                         '"bgcolor="#' + ( ((col + row) % 2) ? 'd9b38c' : 'fff5e6') +
                         '" width="65" height="65" style="font-size: 45px;"' +
                         ' onclick="makeUserMove(this.id)">' + pieces[board[square] & 15] +
                         '</td>';
      }
      
      // close table row tag
      chessBoard += '</tr>';
    }
    
    // close div tag
    chessBoard += '</table>';
    
    // render chess board to screen
    document.getElementById('board').innerHTML = chessBoard;
  };

  // parse & init search depth
//  if (window.location.href.includes('searchDepth'))
//    searchDepth = parseInt(window.location.href.split('searchDepth=')[1].split('&')[0])
  
  // parse & init side color
/////  if (window.location.href.includes('color')) {
/////    if (window.location.href.split('color=')[1].split('&')[0] == 'black') {
/////      flip = 1;
      
/////      setTimeout(function() {
/////        makeEngineMove(searchDepth);
/////      }, 1000);
/////    }
/////  }

  // initially render board view
  drawBoard();
//*
  // ------------------------------------------------------------------------------------------------------------
  // gotz offline eval

  function uci(source = null, target = null) {

    if (!source) source = bestSourceSquare
    if (!target) target = bestTargetSquare

    files = "ABCDEFGH"    
    rows  = "87654321"
    color = (24 - sideToMove) == 8 ? "WHITE" : "BLACK"
    pieceName = [ "", "PAWN", "PAWN", "KING", "KNIGHT", "BISHOP", "ROOK", "QUEEN" ]

    //console.log(bestSourceSquare, bestTargetSquare)
    s = files[source - Math.floor(source / 16) * 16] + rows[Math.floor(source / 16)] 
    t = files[target - Math.floor(target / 16) * 16] + rows[Math.floor(target / 16)]

    return s + t
  }

  maxPlies = 6
  searchDepth = 3
  ply = 0

  //score = search(sideToMove, -10000, 10000, depth);
  //sideToMove = 24 - sideToMove;

  console.log("Starting...")

  while (!maxPlies || ply < maxPlies) {
    ply++        
    //for (i=0;i<1000;i++){console.log(i)}    
    makeEngineMove(searchDepth)    
    drawBoard()    
  }  
  
  console.log("Finishing...")
//*/
// ------------------------------------------------------------------------------------------------------------