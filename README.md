# watchful_mirror
Never let someone sneak up behind you with this motion detecting webcam app. (Works best with an external webcam or external monitors)

### What does it do?
I was tired of being startled in my new cube at work, so I wrote this motion activated webcam app to alert me to movement behind my back.
It hides itself after 5 seconds of no movement, when movement is detected it will pop up on the screen somewhat transparent.

It works best when you have a docked laptop that you can point behind you at an angle. If you find that there are too many false positives you can increase the tolerance threshold in the config file.

In debug mode the app will overlay the movement highlights.
 
Start from commmand line or download a platform specific prepackaged archive. (Coming soon)

## Install
```
1. git clone https://github.com/pwdonald/watchful_mirror.git
2. cd watchful_mirror
3. npm install
```

## Run
```
npm start
```
