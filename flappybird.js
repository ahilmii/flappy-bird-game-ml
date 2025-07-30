const MODEL_PATH = 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4';
const video = document.getElementById('webcam');

let movenet;




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
let velocityX = -2; // pipes moving left speed
let velocityY = 0; // bird jumping speed
let gravity = 0.2;

let gameOver = false;
let score = 0;

window.onload = function () {
    board        = document.getElementById("board");
    board.height = boardHeight; 
    board.width  = boardWidth;
    context      = board.getContext("2d"); // used for drawing on the board 

    // draw flappy bird
    context.fillStyle = "green";
    context.fillRect(bird.x, bird.y, birdWidth, birdHeight);


    // load images
    birdImg = new Image();
    birdImg.src = "./flappybird.png";
    birdImg.onload = function () {
        context.drawImage(birdImg, bird.x, bird.y, birdWidth, birdHeight);    
    }

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";

    requestAnimationFrame(update);
    setInterval(placePipes, 1500); // every 1.5 seconds

    document.addEventListener("keydown", moveBird);

}

function update() {
    requestAnimationFrame(update);
    if (gameOver) {
        return;
    }

    context.clearRect(0,0, board.width, board.height); // görsellerin üst üste binememsi için her seferinde ekranı temizkiyoruz

    // bird
    velocityY += gravity;
    bird.y    += velocityY;
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
    context.font      = "45px sans-serif";
    context.fillText(score, 5, 45);

    if (gameOver) {
        context.fillText(`SCORE ${score}`, 50, 240);
        context.fillText("GAME OVER", 50, 300);
        
    }



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
    let openingSpace = board.height / 4;


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



function moveBird(solbilek, solomuz) {
    if (solbilek < solomuz) {
        // jump
        velocityY = -3.5;
    
        // reset game
        if (gameOver) {
            bird.y = birdY;
            pipeArray = [];
            score = 0;
            gameOver = false;
        }
        
    
    }
}


function detectCollision(a, b) {
    return      a.x < b.x + b.width && b.x < a.x + a.width 
                && 
                a.y < b.y + b.height && b.y < a.y + a.height

    
    /* 
    detectCollision(bird, pipe) biçiminde çalıştırıyorum. fonksiyon temel olarak şunu yapıyor:
    a.x < b.x + b.width: a nesnesinin sol kenarı, b nesnesinin sağ kenarından daha solda mı?
    b.x < a.x + a.width: b nesnesinin sol kenarı, a nesnesinin sağ kenarından daha solda mı?
    a.y < b.y + b.height: a nesnesinin üst kenarı, b nesnesinin alt kenarından daha yukarıda mı?
    b.y < a.y + a.height: b nesnesinin üst kenarı, a nesnesinin alt kenarından daha yukarıda mı?
    
    Bu dört koşul "aynı anda" sağlanıyorsa, iki dikdörtgenin alanları kesişiyor demektir, yani çarpışma var.
    */                

}

//  const sol_omuz = arrayOutput[0][0][5][0]; // henüz kullanmadım
//  const sol_bilek = arrayOutput[0][0][9][0]; // y koordinatları

async function setupWebcamAndModel() { // Kamerayı başlatan ve her şeyi hazır eden ana fonksiyon
    
    // 1. Kullanıcıdan kamera izni iste ve video akışını başlat
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            'video': true
        });

        video.srcObject = stream;
    } catch (err) {
        console.log("kamera başlatılamadı: " + err);
        return;
    }       

    movenet = await tf.loadGraphModel(MODEL_PATH, {fromTFHub: true});
    video.addEventListener('loadeddata', runPredictionLoop())     // 3. Video oynamaya hazır olduğunda, tahmin döngüsünü başlat

}


async function runPredictionLoop() {

    if (movenet && video.readyState >= 3) { // readyState, videonun oynatılmaya hazır olup olmadığı hakkında bilgi verir.

        let imageTensor = tf.browser.fromPixels(video);     // 1. Video'nun o anki karesini bir tensöre dönüştür

        const videoHeight = video.videoHeight;
        const videoWidth = video.videoWidth;

        const cropSize = Math.min(videoHeight, videoWidth); // Kırpılacak karenin boyutunu, videonun en küçük kenarı olarak belirle.

        const cropStartPoint = [          // Kırpmanın başlayacağı noktaları, kareyi videonun merkezine oturtacak şekilde hesapla.

            (videoHeight - cropSize) / 2, // Y (dikey) başlangıç noktası
            (videoWidth - cropSize) / 2,  // X (yatay) başlangıç noktası
            0                             // Renk kanalı başlangıcı (her zaman 0)
        ];
        let croppedTensor  = tf.slice(imageTensor, cropStartPoint, [cropSize, cropSize, 3]); // 2. Görüntüyü kırp (aynı mantıkla)

        let resizedTensor = tf.image.resizeBilinear(croppedTensor, [192, 192], true).toInt(); // 3. Yeniden boyutlandır

         // 4. Batch boyutu ekle
        let tensorOutput = movenet.execute(tf.expandDims(resizedTensor));
        let arrayOutput = await tensorOutput.array();
        
        console.log(arrayOutput);

        const sol_bilek = arrayOutput[0][0][9][0]; // y koordinatlarını aldım
        const sol_omuz  = arrayOutput[0][0][5][0]; 

        moveBird(sol_bilek, sol_omuz);

        // Tensörleri bellekten temizleyerek sızıntıyı önle! (Önemli!)
        imageTensor.dispose();
        croppedTensor.dispose();
        resizedTensor.dispose();
        tensorOutput.dispose();


        // Tarayıcı bir sonraki kareyi çizmeye hazır olduğunda bu fonksiyonu TEKRAR ÇAĞIR.
        // Bu, saniyede yaklaşık 60 kez tekrarlanarak akıcı bir video analizi sağlar.
        window.requestAnimationFrame(runPredictionLoop);
    }

}



// Her şeyi başlatmak için ilk fonksiyonu çağır
setupWebcamAndModel();