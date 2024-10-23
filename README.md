# Image Reviewer App

## Purpose
This application was created to make it easier for me and my partner to
pick 100 images out of 1300+ photos during our wedding prenup photoshoot.
I decided to make this open source to help those with similar problems.

> BUGS WARNING: This is not a polished app. I made this within 2 hours of coding to have something usable.
> Bugs will pop up from time to time and UX considerations for other users had not been made. 
> Use at your own risk.

## What can this do?

This application allows you to do three things

1. Enables you and your partner to vote "yes" or "no" on pictures that you like or dislike through a Kahoot style app.
2. Provides scripts that allow you to group similar looking / duplicated photos. This allows you to efficiently group photos taken from burst shots.
3. Enables you to rate photos from 1 - 5, and automatically picks the top N photos based on the combined ratings of you and your partner.

## How to start the app

```shell
npm install # install dependencies
npm start
```

## How do I use it?

### Yes/No Voting
1. Place all your images into the `images` folder. The application will display images that's in this folder.
2. Start the application
3. Open `http://localhost:3000` on the browser window.
4. Open `http://wedding.loca.lt/vote.html` on your mobile phone.
5. Vote yes / no on pictures you like or dislike.

The application will sort it based on the following rules

- If both are yes, the image is placed inside the "accepted" folder
- If both are no, the image is placed inside the "rejected" folder
- If one is yes, the image is placed inside the "maybe" folder

The "maybe" folder is used to pick from if you and your partner didn't accept
enough photos.

> To personalise the app, replace "Chris" and "Ivy" inside the files inside the public folder with your names.

### Grouping duplicated / similar photos

1. Place all your photos into the `images` folder.
2. Run `npm run group`
3. Review the images inside the `grouped_images` folder and select the ones you like the most.

> It uses perceptual hashing to group together similar or duplicated photos.
> Modify the THRESHOLD variable to adjust how the algorithm groups photos.
> The lower the value, the more the algorithm finds exact copies of the images. 

> If you want to experiment with the threshold values to play around with the grouping
> behaviour, you can run `npm run group:undo` to undo the last grouping operation.

### Rating photos

1. Place all your photos into the `images` folder.
2. Open app.js and change the `VARIANT` variable to specify number of images to keep. 
2. Start the application.
3. Open `http://localhost:3000` on the browser window.
4. Open `http://wedding.loca.lt/rating.html` on your mobile phone.
5. Rate images between 1 - 5

> rating.html page is VERY clunky since it loads the image through the local tunnel.
> If you get errors, simply refresh the page.

> You can open the browser window so you can see if the image on your phone is out of sync.

## Recommended Process

1. Filter out images you like or dislike using voting.
2. Remove duplicates by using grouping.
3. Pick the number of images using rating.