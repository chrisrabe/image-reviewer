const fs = require('fs-extra');
const path = require('path');
const phash = require('sharp-phash');
const dist = require('sharp-phash/distance');

const THRESHOLD = 15; // TODO: Change Me

// Function to group similar images and move them to subfolders as they're processed
async function groupSimilarImages(folderPath, threshold = 5, outputFolder = 'grouped_images') {
    // Ensure the output folder exists
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }

    // Read all images from the input folder
    const images = await fs.readdir(folderPath);
    const imageFiles = images.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    // Dictionary to store groups of similar images
    const groups = [];

    // Iterate over each image, calculate its perceptual hash, and move it to the appropriate group folder
    for (const image of imageFiles) {
        const imagePath = path.join(folderPath, image);
        const imageHash = await phash(imagePath);

        if (!imageHash) continue; // Skip if hash calculation failed

        let addedToGroup = false;

        // Compare hash with existing groups and move the image immediately
        for (const group of groups) {
            const groupHash = group.hash;

            // Calculate the Hamming distance between hashes
            const distance = dist(imageHash, groupHash);

            // If hashes are similar, move the image to the group's folder
            if (distance <= threshold) {
                const groupFolder = path.join(outputFolder, `group_${group.id}`);
                await fs.mkdirp(groupFolder);
                const destPath = path.join(groupFolder, path.basename(imagePath));
                await fs.move(imagePath, destPath);  // Move the image immediately
                addedToGroup = true;
                break;
            }
        }

        // If no similar group found, create a new group and move the image
        if (!addedToGroup) {
            const newGroupId = groups.length + 1;
            const groupFolder = path.join(outputFolder, `group_${newGroupId}`);
            await fs.mkdirp(groupFolder);

            // Move the image to the new group folder
            const destPath = path.join(groupFolder, path.basename(imagePath));
            await fs.move(imagePath, destPath);

            // Add the new group to the groups array
            groups.push({
                id: newGroupId,
                hash: imageHash,
            });
        }
    }

    console.log(`Grouped images and moved them to ${outputFolder}`);
}

// Example usage
const folderPath = './images'; // Replace with the folder path containing your images

groupSimilarImages(folderPath, THRESHOLD, './grouped_images').then(() => {
    console.log('Done');
});
