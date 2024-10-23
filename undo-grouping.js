const fs = require('fs-extra');
const path = require('path');

// Function to move images from subfolders into a destination folder and delete subfolders when empty
async function moveImagesToFolder(sourceFolder, destinationFolder) {
    // Ensure the destination folder exists
    if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder);
    }

    // Read the subfolders inside the source folder
    const subfolders = await fs.readdir(sourceFolder);

    // Iterate over each subfolder
    for (const subfolder of subfolders) {
        const subfolderPath = path.join(sourceFolder, subfolder);

        // Check if it's a directory
        const stats = await fs.stat(subfolderPath);
        if (stats.isDirectory()) {
            // Read the images inside the subfolder
            const files = await fs.readdir(subfolderPath);
            for (const file of files) {
                // Check if the file is an image
                if (/\.(jpg|jpeg|png|gif)$/i.test(file)) {
                    const imagePath = path.join(subfolderPath, file);
                    const destPath = path.join(destinationFolder, file);

                    // Move the image to the destination folder
                    await fs.move(imagePath, destPath);

                    console.log(`Moved ${file} to ${destinationFolder}`);
                }
            }

            // Check if the subfolder is now empty and delete it
            const remainingFiles = await fs.readdir(subfolderPath);
            if (remainingFiles.length === 0) {
                await fs.remove(subfolderPath);  // Delete the subfolder
                console.log(`Deleted empty folder: ${subfolderPath}`);
            }
        }
    }

    console.log(`All images moved to ${destinationFolder}`);
}

// Example usage
const sourceFolder = './grouped_images';  // Folder containing the subfolders with images
const destinationFolder = './images';  // Folder to move all images to

moveImagesToFolder(sourceFolder, destinationFolder).then(() => {
    console.log('Done moving images');
});
