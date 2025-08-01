const MODEL_PATH = 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4';
const video = document.getElementById('webcam');

let movenet;
let toggle = document.getElementById('toggle');


let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

let birdWidth  = 34;
let birdHeight = 24;
let birdX = boardWidth / 8; // başlangıç konumu
let birdY = boardHeight / 2;
let birdImg;

let bird = {
    x : birdX, // kuşun başlangıç konumu (sol üst köşeden)
    y : birdY, // kuşun başlangıç konumu (sol üst köşeden)
    width : birdWidth, // kuşun genişliği
    height : birdHeight // kuşun uzunluğu
}


// pipes
let pipeArray  = [];
let pipeWidth  = 64; // width/height ratio on the real image --> 384/1072 = 1/8  ----> 64/512 = 1/8
let pipeHeight = 512;
let pipeX      = boardWidth; // yani 360 olarak tanımladık. yükseklik 0. yani sağ üst köşeden başlayacak.
let pipeY      = 0;

let topPipeImg;
let bottomPipeImg;

//pyhsics
let velocityX = -1.8; // pipes moving left speed
let velocityY = 0; // bird jumping speed
let gravity = 0.18;

let gameOver = false;
let score = 0;

let canFlap = true; // Zıplama eyleminin yapılıp yapılamayacağını kontrol eder


window.onload = function () {
    board        = document.getElementById("board");
    board.height = boardHeight; 
    board.width  = boardWidth;
    context      = board.getContext("2d"); // used for drawing on the board 

    birdImg = new Image();
    birdImg.src = "./assets/flappybird.png";

    topPipeImg = new Image();
    topPipeImg.src = "./assets/toppipe.png";
    
    bottomPipeImg = new Image();
    bottomPipeImg.src = "./assets/bottompipe.png";

    // Olay dinleyicileri
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            jump();
        }
    });

    setupWebcamAndModel();
    requestAnimationFrame(update);
    setInterval(placePipes, 2000); 
}


function update() {
    requestAnimationFrame(update);

    if (gameOver) {
        context.fillText(`SCORE ${score}`, 50, 240);
        context.fillText("GAME OVER", 50, 300);
                
        return;
    }

    context.clearRect(0,0, board.width, board.height); // görsellerin üst üste binememsi için her seferinde ekranı temizkiyoruz

    // bird
    velocityY += gravity;
    bird.y     = Math.max(bird.y + velocityY, 0); // eğer kuş canvas'ın üst sınırının yukarısına çıkarsa negatif bir değer almış olur dolayısıyla fonc 0 döndürür.
                                                  // eğer canvas içerisinde başka herhangi bir konumda ise pozitif bir değer demektir ve sol taraf çalışır.  
    context.drawImage(birdImg, bird.x, bird.y, birdWidth, birdHeight);

    if (board.height < bird.y) {
        gameOver = true;
    }

    // pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && pipe.x + pipe.width < bird.x) {
            score += 0.5; // 2 tane boru olduğu için 0.5
            pipe.passed = true;
        }    

        if (detectCollision(bird, pipe)) {
            gameOver = true;
        }

    }

    // clear pipes
    while (0 < pipeArray.length && pipeArray[0].x + pipeWidth  < 0) {
        pipeArray.shift();
    }


    context.fillStyle = "white";
    context.font = "45px 'Press Start 2P'";
    context.fillText(score, 5, 45);
    context.shadowColor = 'black';
    context.shadowBlur = 7;


}



function placePipes() {

    if (gameOver) {
        return;
    }

    let randomPipeY = pipeY - (pipeHeight / 4) - (Math.random() * (pipeHeight / 2)); 
    // pipeY = 0. pipeHeight = 512 -->  
    // eğer random sayodan 0 gelirse uzunluk -128 olur.
    // eğer 1 gelirse 0 - 128 - 256 = -384  
    // uzunluğu -128 ile -384 arasında değişir. yani boruların bir kısmını gizlemiş olduk.
    let openingSpace = board.height / 3;


    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }

    pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }

    pipeArray.push(bottomPipe);
}


function jump() {

    if(!gameOver && canFlap) {
        velocityY = -5.5;
        canFlap   = false; // zıplama yapıldı bir sonrakine izin verme (şimdilik) -- sonsuz zıplamayı engellemek için  
    }

    // eğer oyun bittiyse her şeyi başlangıç durumuna sıfırlıyoruz.
    if (gameOver) { 
        bird.y    = birdY;
        pipeArray = [];
        score     = 0;
        gameOver  = false;
        canFlap   = true; // oyuna yeniden başlarken zıplama kilidini açıyoruz.  
    }

}



function detectCollision(a, b) {
    return      a.x < b.x + b.width && b.x < a.x + a.width 
                && 
                a.y < b.y + b.height && b.y < a.y + a.height
}


async function setupWebcamAndModel() { // Kamerayı başlatan ve her şeyi hazır eden ana fonksiyon
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            'video': true
        });

        video.srcObject = stream;

        await new Promise( (resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        }); 


    } catch (err) {
        console.log("kamera başlatılamadı: " + err);
        alert("Lütfen kamera erişimine izin verin.");
        return;
    }       

    movenet = await tf.loadGraphModel(MODEL_PATH, {fromTFHub: true});
    runPredictionLoop();
}


async function runPredictionLoop() {

    if (movenet && video.readyState >= 3) { 

        let imageTensor = tf.browser.fromPixels(video);   

        const videoHeight = video.videoHeight;
        const videoWidth = video.videoWidth;

        const cropSize = Math.min(videoHeight, videoWidth); 

        const cropStartPoint = [          

            (videoHeight - cropSize) / 2, 
            (videoWidth - cropSize) / 2,  
            0                            
        ];
        let croppedTensor  = tf.slice(imageTensor, cropStartPoint, [cropSize, cropSize, 3]); 

        let resizedTensor = tf.image.resizeBilinear(croppedTensor, [192, 192], true).toInt(); 

         // 4. Batch boyutu ekle
        let tensorOutput = movenet.execute(tf.expandDims(resizedTensor));
        let arrayOutput = await tensorOutput.array();
        
        handlePose(arrayOutput);


        tf.dispose([imageTensor, croppedTensor, resizedTensor, tensorOutput]);


    }
    window.requestAnimationFrame(runPredictionLoop);
}


function handlePose(arrayOutput) {
    
    // gerekli anahtar noktaların koordinatlarını alıyoruz.
    const sagBilek = arrayOutput[0][0][10][0]; // y koordinatlarını aldım
    const sagOmuz  = arrayOutput[0][0][6][0]; 
    const sagBilekConfiidence = arrayOutput[0][0][10][2]; //güven skorlarını aldık.
    const sagOmuzConfidence   = arrayOutput[0][0][6][2]; 

    
    const solBilek = arrayOutput[0][0][9][0]; // y koordinatlarını aldım
    const solOmuz  = arrayOutput[0][0][5][0]; 
    const solBilekConfiidence = arrayOutput[0][0][9][2]; //güven skorlarını aldık.
    const solOmuzConfidence   = arrayOutput[0][0][5][2]; 


    if (toggle.checked == true) { // yani sağ seçili ise
        if (0.2 < sagBilekConfiidence && 0.2 < sagOmuzConfidence) {
            if (sagBilek < sagOmuz) { // bilek omuzun üzerindeyken zıpla.
                jump();
            } else {
                canFlap = true;       // eğer omuz yukarıdaysa tekrar zıplamaya izin ver.
            }

        }

    } else { // yani sol seçili ise

        if (0.2 < solBilekConfiidence && 0.2 < solOmuzConfidence) {
            if (solBilek < solOmuz) { // bilek omuzun üzerindeyken zıpla.
                jump();
            } else {
                canFlap = true;       // eğer omuz yukarıdaysa tekrar zıplamaya izin ver.
            }
        }
    }

}