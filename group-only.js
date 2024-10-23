const fs = require('fs-extra');
const path = require('path');

// Function to move single-image subfolders to a destination folder and delete the subfolder
async function moveSingleImageFolders(sourceFolder, destinationFolder) {
    // Ensure the destination folder exists
    if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder);
    }

    // Read all subfolders from the source folder
    const subfolders = await fs.readdir(sourceFolder);

    // Iterate over each subfolder
    for (const subfolder of subfolders) {
        const subfolderPath = path.join(sourceFolder, subfolder);

        // Check if the subfolder is a directory
        const stats = await fs.stat(subfolderPath);
        if (stats.isDirectory()) {
            // Read the contents of the subfolder
            const files = await fs.readdir(subfolderPath);
            const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

            // If the subfolder contains only one image
            if (imageFiles.length === 1) {
                const imagePath = path.join(subfolderPath, imageFiles[0]);
                const destPath = path.join(destinationFolder, imageFiles[0]);

                // Move the image to the destination folder
                await fs.move(imagePath, destPath);
                console.log(`Moved ${imageFiles[0]} to ${destinationFolder}`);

                // Delete the now-empty subfolder
                await fs.remove(subfolderPath);
                console.log(`Deleted empty folder: ${subfolderPath}`);
            }
        }
    }

    console.log(`Finished moving single-image folders to ${destinationFolder}`);
}

// Example usage
const sourceFolder = './grouped_images';  // Folder containing the subfolders
const destinationFolder = './images';  // Folder to move single images to

moveSingleImageFolders(sourceFolder, destinationFolder).then(() => {
    console.log('Done');
});
