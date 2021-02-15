# Installing Akita

Akita has been tested in Mozilla Firefox and Chromium-based browsers (i.e. Chrome, Brave, Microsoft Edge, etc.). Instructions to install Akita on these browsers is provided below.

Our license information can be found [here](LicenseInfo.md) and our license/copyright notices can be found in [LICENSE](../LICENSE).

## Installing Akita from Browser Extension/Add-On Stores

- ### **Chrome Web Store**: [https://chrome.google.com/webstore/detail/akita/phcipgphomfgkenfmjnbmajdiejnlmgg](https://chrome.google.com/webstore/detail/akita/phcipgphomfgkenfmjnbmajdiejnlmgg)
- ### **Firefox Browser Add-ons**: _Coming soon..._
- ### **Microsoft Edge Add-ons**: _Coming soon..._

## Installing Akita Manually (From Source or Package)

### Step 1: Download Akita Source
From your preferred directory, run the command:

`git clone https://github.com/esse-dev/akita.git`

Note the path to the newly created `akita` directory.

### Step 2, Option 1: Install Akita in Your Browser from Source

#### Installing Akita in Chromium-Based Browsers (i.e. Chrome, Brave, Microsoft Edge, etc.)
1. In the browser address bar, type in `<BROWSER_NAME>://extensions/`. Press enter.
    - `<BROWSER_NAME>` is `chrome` for Google Chrome, `brave` for Brave Browser, `edge` for Microsoft Edge, etc.
    - example: `brave://extensions/`
2. Ensure "Developer mode" is toggled "ON"
    - For Chrome and Brave, this is in the _top right_ corner of the page.
    - For Edge, this is in the _bottom left_ of the page.
3. Click on "Load unpacked". A system file selection window should open.
4. In the selection window, navigate to the `akita` directory and select it.
5. Akita is now installed - you should see the Akita extension icon in your browser bar!!
    - Note: Some browsers may not pin the extension to the browser bar by default. You may need to pin it manually.

#### Installing Akita in Mozilla Firefox
1. In your Firefox address bar, type in `about:debugging#/runtime/this-firefox`. Press enter.
2. Click on "Load Temporary Add-on...". A system file selection window should open.
3. In the selection window, navigate to the `akita` directory and select any file in it.
4. Akita is now installed - you should see the Akita extension icon in your browser bar!!

Some notes for Firefox:
- Since Akita is installed as a temporary add-on, it only stays until you restart Firefox.
- If you're feeling extra crafty, you can also install Akita using [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).

### Step 2, Option 2: Install Akita in Your Browser from Package

#### Package Akita into a .zip
1. Make sure you have the command-line tools `bash` and `zip` installed.
2. From the akita directory, run `bash ./packageAkita.sh`.
3. The resulting file akita.zip can be loaded into Firefox and Chrome.

#### To Install `akita.zip` in Chromium-Based Browsers (i.e. Chrome, Brave, Microsoft Edge, etc.)
1. In the browser address bar, type in `<BROWSER_NAME>://extensions/`. Press enter.
    - `<BROWSER_NAME>` is `chrome` for Google Chrome, `brave` for Brave Browser, `edge` for Microsoft Edge, etc.
    - example: `brave://extensions/`
2. Ensure "Developer mode" is toggled "ON"
    - For Chrome and Brave, this is in the _top right_ corner of the page.
    - For Edge, this is in the _bottom left_ of the page.
3. From your file explorer, drag `akita.zip` into the browser window.
4. Akita is now installed - you should see the Akita extension icon in your browser bar!!
    - Note: Some browsers may not pin the extension to the browser bar by default. You may need to pin it manually.

#### To Install `akita.zip` in Mozilla Firefox
1. In your Firefox address bar, type in `about:debugging#/runtime/this-firefox`. Press enter.
2. Click on "Load Temporary Add-on...". A system file selection window should open.
3. In the selection window, select `akita.zip`
4. Akita is now installed - you should see the Akita extension icon in your browser bar!!

A note for Firefox:
- Since Akita is installed as a temporary add-on, it only stays until you restart Firefox.
