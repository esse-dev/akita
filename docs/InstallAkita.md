# Installing Akita

Akita has been tested in Mozilla Firefox and Google Chrome. Instructions to install on these browsers is provided below. We hope to release Akita to browser extension stores in the near future.

## Step 1: Download Akita Source
From your preferred directory, run the command:

`git clone https://github.com/dog-s/akita.git`

Note the path to the newly created `akita` directory.

## Step 2: Install Akita in Your Browser

### Installing Akita in Google Chrome
1. In your Chrome address bar, type in `chrome://extensions/`. Press enter.
2. Ensure "Developer mode" is toggled "ON" in the top right corner of the page.
3. Click on "Load unpacked". A system file selection window should open.
4. In the selection window, navigate to the `akita` directory and select it.
5. Akita is now installed - you should see the Akita extension icon in your browser bar!!

### Installing Akita in Mozilla Firefox
1. In your Firefox address bar, type in `about:debugging#/runtime/this-firefox`. Press enter.
2. Click on "Load Temporary Add-on...". A system file selection window should open.
3. In the selection window, navigate to the `akita` directory and select any file in it.
4. Akita is now installed - you should see the Akita extension icon in your browser bar!!

Some notes for Firefox:
- Since Akita is installed as a temporary add-on, it only stays until you restart Firefox.
- If you're feeling extra crafty, you can also install Akita using [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).