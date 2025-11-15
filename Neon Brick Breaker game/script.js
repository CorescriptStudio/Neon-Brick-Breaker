document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const livesEl = document.getElementById('lives');

    // --- NEW: Audio Setup ---
    // Create a web audio context for sound effects
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // --- NEW: Game State ---
    let gameState = 'playing'; // 'playing', 'levelWon', 'gameOver'

    // Game State (Matches the image)
    let score = 700;
    let level = 1;
    let lives = 3;
    let totalBricks = 0; // Will be counted when bricks are created

    // Ball properties
    const ballRadius = 8;
    let ball = {
        x: 100,
        y: 300,
        dx: 3,
        dy: -3
    };

    // Paddle properties
    const paddleHeight = 15;
    const paddleWidth = 100;
    let paddleX = (canvas.width - paddleWidth) / 2;

    // Brick properties
    const brickWidth = 55;
    const brickHeight = 20;
    const brickPadding = 5;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 20;
    let bricks = [];

    // Color map for bricks
    const colorMap = {
        o: "#FFA500", // Orange
        p: "#800080", // Purple
        l: "#ADD8E6", // Light Blue
        g: "#808080"  // Grey
    };

    // EXACT layout from the image. ' ' is an empty space.
    let levelLayout = [
        ['o', 'p', 'l', 'g', 'o', 'o', 'p', 'p', 'l', 'g'],
        [' ', ' ', 'g', 'l', 'g', 'o', 'g', 'p', 'l', ' '],
        [' ', ' ', 'g', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ];

    // --- NEW: Particle System ---
    let particles = [];
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = Math.random() * 2 + 1;
            this.dx = (Math.random() - 0.5) * 3; // Horizontal velocity
            this.dy = (Math.random() - 0.5) * 3; // Vertical velocity
            this.gravity = 0.05;
            this.life = 50; // Lifespan in frames
            this.alpha = 1;
        }

        update() {
            this.dy += this.gravity; // Apply gravity
            this.x += this.dx;
            this.y += this.dy;
            this.life--;
            if (this.life < 20) {
                this.alpha = Math.max(0, this.life / 20); // Fade out
            }
        }

        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
            ctx.globalAlpha = 1.0; // Reset alpha
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) {
                particles.splice(i, 1); // Remove dead particles
            }
        }
    }

    function drawParticles() {
        particles.forEach(p => p.draw());
    }

    function createBrickExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) { // Create 10 particles
            particles.push(new Particle(x, y, color));
        }
    }


    // --- 2. CREATE GAME OBJECTS ---

    function createBricks() {
        totalBricks = 0;
        bricks = []; // Clear old bricks
        const brickRowCount = levelLayout.length;
        const brickColumnCount = levelLayout[0].length;

        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                const layoutChar = levelLayout[r][c];
                let status = (layoutChar !== ' ') ? 1 : 0;

                if (status === 1) {
                    totalBricks++;
                }

                bricks[c][r] = {
                    x: c * (brickWidth + brickPadding) + brickOffsetLeft,
                    y: r * (brickHeight + brickPadding) + brickOffsetTop,
                    status: status,
                    color: colorMap[layoutChar]
                };
            }
        }
    }

    // --- 3. DRAW FUNCTIONS ---

    function drawBall() {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#00ffff";
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.closePath();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    function drawPaddle() {
        ctx.beginPath();
        ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
        ctx.fillStyle = "#0077ff"; // Blue paddle
        ctx.shadowColor = '#0077ff';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.closePath();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    function drawBricks() {
        for (let c = 0; c < bricks.length; c++) {
            for (let r = 0; r < bricks[c].length; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    ctx.beginPath();
                    ctx.rect(b.x, b.y, brickWidth, brickHeight);
                    ctx.fillStyle = b.color;
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    // --- NEW: Draw UI Messages ---
    function drawMessages() {
        if (gameState === 'gameOver' || gameState === 'levelWon') {
            // Create a semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = '48px "Courier New", Courier, monospace';
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.textShadow = '0 0 10px #00ffff';

            if (gameState === 'gameOver') {
                ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
            } else if (gameState === 'levelWon') {
                ctx.fillText('LEVEL CLEARED!', canvas.width / 2, canvas.height / 2 - 20);
            }

            ctx.font = '20px "Courier New", Courier, monospace';
            ctx.fillText('Click to play again', canvas.width / 2, canvas.height / 2 + 20);

            ctx.textShadow = 'none';
            ctx.textAlign = 'left'; // Reset
        }
    }


    // --- 4. GAME LOGIC ---

    // --- NEW: Audio Function ---
    function playSound(type) {
        let freq = 0;
        let duration = 0.1;
        let waveType = 'sine';

        switch (type) {
            case 'brick':
                freq = 300 + Math.random() * 100; // Higher pitch
                duration = 0.05;
                waveType = 'square';
                break;
            case 'paddle':
                freq = 200; // Medium pitch
                waveType = 'sine';
                break;
            case 'wall':
                freq = 150; // Low pitch
                duration = 0.05;
                break;
            case 'lose':
                freq = 100; // Very low "thud"
                duration = 0.2;
                waveType = 'sawtooth';
                break;
        }

        if (freq === 0) return;

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    }


    function updateUI() {
        scoreEl.textContent = `Score: ${score}`;
        levelEl.textContent = `Level: ${level}`;
        livesEl.textContent = `Lives: ${lives}`;
    }

    function resetBallAndPaddle() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 30;
        ball.dx = 3;
        ball.dy = -3;
        paddleX = (canvas.width - paddleWidth) / 2;
    }

    // --- NEW: Reset for new game ---
    function restartGame() {
        // Here you would load the next level layout if level > 1
        // For this example, we just reset.
        if (gameState === 'levelWon') {
            level++;
            // In a real game, you'd load a new levelLayout here
            // e.g., levelLayout = getLevel(level);
        } else {
            // Reset score and level on Game Over
            score = 0;
            level = 1;
            lives = 3;
        }

        createBricks();
        resetBallAndPaddle();
        updateUI();
        gameState = 'playing';
    }


    function collisionDetection() {
        for (let c = 0; c < bricks.length; c++) {
            for (let r = 0; r < bricks[c].length; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    if (ball.x > b.x && ball.x < b.x + brickWidth &&
                        ball.y > b.y && ball.y < b.y + brickHeight) {

                        ball.dy = -ball.dy;
                        b.status = 0;
                        score += 100;
                        totalBricks--;
                        updateUI();
                        playSound('brick'); // --- MODIFIED ---
                        createBrickExplosion(b.x + brickWidth / 2, b.y + brickHeight / 2, b.color); // --- NEW ---

                        if (totalBricks === 0) {
                            // --- MODIFIED: No more alerts! ---
                            gameState = 'levelWon';
                        }
                    }
                }
            }
        }
    }

    function moveBall() {
        // Wall collision (Left/Right)
        if (ball.x + ball.dx > canvas.width - ballRadius || ball.x + ball.dx < ballRadius) {
            ball.dx = -ball.dx;
            playSound('wall'); // --- NEW ---
        }

        // Wall collision (Top)
        if (ball.y + ball.dy < ballRadius) {
            ball.dy = -ball.dy;
            playSound('wall'); // --- NEW ---
        }

        // Wall collision (Bottom)
        else if (ball.y + ball.dy > canvas.height - ballRadius) {
            // Check for paddle collision
            if (ball.x > paddleX && ball.x < paddleX + paddleWidth) {

                // --- MODIFIED: Variable Paddle Bounce ---
                // Calculate hit position relative to paddle center (-1 to 1)
                let hitPos = (ball.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
                // Max horizontal speed
                let maxDx = 5;
                ball.dx = hitPos * maxDx;

                // Always reverse Y direction
                ball.dy = -ball.dy;

                playSound('paddle'); // --- NEW ---

            } else {
                // You missed the ball
                lives--;
                updateUI();
                playSound('lose'); // --- NEW ---

                if (lives === 0) {
                    // --- MODIFIED: No more alerts or reloads! ---
                    gameState = 'gameOver';
                } else {
                    resetBallAndPaddle();
                }
            }
        }

        // Move the ball
        ball.x += ball.dx;
        ball.y += ball.dy;
    }

    // --- 5. MAIN GAME LOOP ---

    function drawGame() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all elements
        drawBricks();
        drawBall();
        drawPaddle();
        drawParticles(); // --- NEW ---

        // --- MODIFIED: Only update logic if playing ---
        if (gameState === 'playing') {
            // Check for collisions
            collisionDetection();

            // Move the ball
            moveBall();

            // Update particles
            updateParticles(); // --- NEW ---
        }

        // Draw overlay messages
        drawMessages(); // --- NEW ---

        // Request the next frame
        requestAnimationFrame(drawGame);
    }

    // --- 6. EVENT LISTENERS ---

    function mouseMoveHandler(e) {
        let relativeX = e.clientX - canvas.getBoundingClientRect().left;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddleX = relativeX - paddleWidth / 2;
            if (paddleX < 0) {
                paddleX = 0;
            }
            if (paddleX + paddleWidth > canvas.width) {
                paddleX = canvas.width - paddleWidth;
            }
        }
    }

    // --- NEW: Click listener to restart game ---
    function mouseClickHandler(e) {
        // Restart only if the game is in a 'game over' or 'win' state
        if (gameState === 'gameOver' || gameState === 'levelWon') {
            restartGame();
        }
    }

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('click', mouseClickHandler); // --- NEW ---

    // --- 7. START THE GAME ---
    createBricks();
    drawGame();
});