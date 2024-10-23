const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const localtunnel = require('localtunnel');

// TODO: Change me
const VARIANT = 40; // Define the number of top-rated images to keep


// Set up Express and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const imagesFolder = path.join(__dirname, 'images');
const acceptedFolder = path.join(__dirname, 'accepted');
const rejectedFolder = path.join(__dirname, 'rejected');
const maybeFolder = path.join(__dirname, 'maybe');
const ratedFolder = path.join(__dirname, 'rated');
const spareFolder = path.join(__dirname, 'spare'); // Define the spare folder
const ratingsFile = path.join(__dirname, 'ratings.json'); // File to store ratings

// Track votes and ratings
let votes = { client1: null, client2: null };
let clientRatings = { client1: null, client2: null }; // Store ratings from two clients
let ratings = {}; // Store image ratings

// Load ratings from file when server starts
function loadRatings() {
    if (fs.existsSync(ratingsFile)) {
        ratings = fs.readJsonSync(ratingsFile, { throws: false }) || {};
        console.log('Loaded existing ratings:', ratings);
    } else {
        console.log('No existing ratings file found. Starting fresh.');
    }
}

// Save ratings to file
function saveRatings() {
    fs.writeJsonSync(ratingsFile, ratings, { spaces: 2 });
    console.log('Ratings saved to file.');
}

app.use(express.static(path.join(__dirname, 'public')));

let imageFileName;

// Get the next image
app.get('/image', (req, res) => {
    fs.readdir(imagesFolder, (err, files) => {
        if (err) return res.status(500).send('Error reading directory');
        if (!files.length) {
            sortAndKeepTopRatedImages(VARIANT); // Sort and keep the top-rated images after all images are rated
            return res.status(404).send('No more images');
        }
        const imageFile = files[0]
        imageFileName = imageFile;
        io.emit('imageLoaded', {imageFile});
        res.sendFile(path.join(imagesFolder, files[0])); // Send the first image
    });
});

// Voting or Rating modes based on query param (voting or rating)
app.post('/move', (req, res) => {
    const { action, mode } = req.query;

    fs.readdir(imagesFolder, (err, files) => {
        if (err || !files.length) return res.status(404).send('No images found');

        const imageFile = files[0];
        const source = path.join(imagesFolder, imageFile);
        let destination;

        if (mode === 'voting') {
            // Voting logic
            if (action === 'accept') {
                destination = path.join(acceptedFolder, imageFile);
            } else if (action === 'reject') {
                destination = path.join(rejectedFolder, imageFile);
            } else {
                destination = path.join(maybeFolder, imageFile);
            }
        } else if (mode === 'rating') {
            // Rating logic
            destination = path.join(ratedFolder, imageFile);
        }

        fs.move(source, destination, err => {
            if (err) return res.status(500).send('Error moving file');
            res.send('Image moved');
        });
    });
});

// WebSocket setup for Voting and Rating
io.on('connection', (socket) => {
    console.log('A client connected');
    socket.emit('imageLoaded', {imageFile: imageFileName});

    // Voting logic
    socket.on('vote', (data) => {
        io.emit('voteUpdated', { client: data.client, vote: data.vote });
        votes[data.client] = data.vote;

        // Check if both clients voted
        if (votes.client1 !== null && votes.client2 !== null) {
            if (votes.client1 === 'Yes' && votes.client2 === 'Yes') {
                moveImage('accept', 'voting').then(() => {
                    io.emit('result', 'accepted');
                    votes = { client1: null, client2: null }; // Reset votes
                }).catch(err => console.error(err));
            } else if (votes.client1 === 'No' && votes.client2 === 'No') {
                moveImage('reject', 'voting').then(() => {
                    io.emit('result', 'rejected');
                    votes = { client1: null, client2: null }; // Reset votes
                }).catch(err => console.error(err));
            } else {
                moveImage('maybe', 'voting').then(() => {
                    io.emit('result', 'maybe');
                    votes = { client1: null, client2: null }; // Reset votes
                }).catch(err => console.error(err));
            }
        }
    });

    // Combined Rating logic
    socket.on('rate', (data) => {
        const { client, imageName, rating } = data;
        clientRatings[client] = parseInt(rating); // Store the rating for the client
        console.log(client, 'rated', rating, imageName);

        // Check if both clients have rated
        if (clientRatings.client1 !== null && clientRatings.client2 !== null) {
            // Combine both client ratings
            ratings[imageName] = clientRatings.client1 + clientRatings.client2; // Store the combined rating for the image

            // Save ratings to the file
            saveRatings();

            // Move the image to the rated folder after both clients have rated
            moveImage('rate', 'rating').then(() => {
                io.emit('rated', imageName);

                // Reset client ratings after both have rated
                clientRatings = { client1: null, client2: null };
            }).catch(err => console.error(err));
        }
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

function moveImage(action, mode) {
    return new Promise((resolve, reject) => {
        fs.readdir(imagesFolder, (err, files) => {
            if (err || !files.length) return reject('No images found');

            const imageFile = files[0];
            const source = path.join(imagesFolder, imageFile);
            let actionFolder = acceptedFolder;

            if (mode === 'voting') {
                actionFolder = action === 'reject' ? rejectedFolder : (action === 'maybe' ? maybeFolder : acceptedFolder);
            } else if (mode === 'rating') {
                actionFolder = ratedFolder;
            }

            const destination = path.join(actionFolder, imageFile);
            fs.move(source, destination, err => {
                if (err) return reject('Error moving file');
                resolve();
            });
        });
    });
}

// Sort rated images and move the lower rated ones to the spare folder
function sortAndKeepTopRatedImages(limit) {
    fs.readdir(ratedFolder, (err, files) => {
        if (err || !files.length) return console.error('No rated images found.');

        // Create an array of images with their ratings
        const ratedImages = files.map(file => ({
            file,
            rating: ratings[file] || 0 // Fallback to 0 if the rating is missing
        }));

        // Sort the rated images by rating (descending order)
        ratedImages.sort((a, b) => b.rating - a.rating);

        // Keep only the top `limit` images
        const topRatedImages = ratedImages.slice(0, limit);

        // Get the images to move to the spare folder (those that are not in the top rated
        const imagesToMove = ratedImages.slice(limit);

        // Move the images that are not in the top rated list to the spare folder
        imagesToMove.forEach(image => {
            const sourcePath = path.join(ratedFolder, image.file);
            const destinationPath = path.join(spareFolder, image.file);

            fs.move(sourcePath, destinationPath, err => {
                if (err) console.error('Error moving file to spare folder:', sourcePath);
                else console.log('Moved to spare:', sourcePath);
            });
        });

        console.log('Top rated images:', topRatedImages.map(image => image.file));
    });
}

// Ensure spare folder exists
fs.ensureDir(spareFolder, err => {
    if (err) console.error('Error ensuring spare folder exists:', err);
});

// Start the server
server.listen(3000, '0.0.0.0', async () => {
    console.log('App is running on http://localhost:3000');

    // Load existing ratings when the server starts
    loadRatings();

    const tunnel = await localtunnel({ port: 3000, subdomain: 'wedding' });
    console.log(`Public URL: ${tunnel.url}`);

    tunnel.on('close', () => {
        console.log('Tunnel closed');
    });
});
