# Akita Privacy Policy

Last updated January 1st 2021.

This Privacy Policy applies to the Akita Browser Extension developed by the contributors at
[https://github.com/esse-dev/akita](https://github.com/esse-dev/akita). This Privacy Policy
addresses the following questions:

1. [What information does Akita collect?](#1-What-information-does-Akita-collect)
2. [How does Akita use the information it collects?](#2-How-does-Akita-use-the-information-it-collects)
3. [What information does Akita share? (none)](#3-What-information-does-Akita-share)
4. [How long does Akita retain your data?](#4-How-long-does-Akita-retain-your-data)
5. [Which browser permissions does Akita use?](#5-Which-browser-permissions-does-Akita-use)
6. [Where can I find Akita's source code?](#6-Where-can-I-find-Akitas-source-code)

The intention of Akita's developers is to create a browser extension which is respectful of your
data and privacy. Akita's developers prioritize data privacy and actively work to avoid data related
bugs, but it is still possible for bugs to arise that lead to lost, leaked, or stolen data. By
installing the Akita browser extension you certify that you understand and accept all
responsibilities and risks associated with using the extension, including possible lost, leaked, or
stolen data; and you do not hold Akita's developers liable or responsible for anything resulting
from your use of the extension.

If you have any questions or concerns about Akita's Privacy Policy, please reach out to the
developers using one of the following methods:

- Send an email to Akita's developers at [AkitaFeedback@gmail.com](mailto:AkitaFeedback@gmail.com)
- [Submit an issue on Akita's GitHub code repository](https://github.com/esse-dev/akita/issues/new?assignees=&labels=&template=blank-issue.md&title=)
- [Join the Akita Discord server](https://discord.gg/psyNbWW)

## 1. What information does Akita collect?

Akita collects the following data:

- The amount of time you've spent on each website you’ve visited;
- A count of your visits to websites;
- Data in the
  ["monetization" meta tag](https://webmonetization.org/docs/explainer#add-meta-tag-to-website-header)
  found in the metadata of the websites you visit, such as a
  [Payment Pointer](https://paymentpointers.org/);
- Whether or not requests sent by Akita to Payment Pointer URLs are successful (to ensure that the
  Payment Pointers are valid); and
- The currencies and amounts of payments you’ve sent using Web Monetization providers via Payment
  Pointers on websites (as reported by the [Web Monetization API](https://webmonetization.org/) to
  the browser).

This information and any insights drawn from it are stored in the local browser storage of your
device. Data collected by Akita is not backed up, shared or uploaded anywhere.

You can view an example of the raw data collected by Akita
[here](https://github.com/esse-dev/akita/blob/master/examples/example_data.json).

## 2. How does Akita use the information it collects?

Akita's single purpose is to give you insight into your browsing data in the context of Web
Monetization, so that you can better understand how you are engaging with Web Monetization while you
browse the web. To provide you with useful information, Akita makes calculations with the data it
collects to generate numbers such as totals, percentages and estimates. More specifically, Akita
shows you the following collected and calculated information in the Akita extension popup:

- The sites that you’ve spent the most time on which have Web Monetization enabled;
  - And for each of these sites:
    - How much time you’ve spent on the site while engaging with Web Monetized content;
    - The percentage of the time you've spent on the site while engaging with Web Monetized content
      out of the total time you’ve spent on websites i.e.
      `100 * (monetized time you've spent on the site) / (total time you've spent on websites)`;
    - The number of visits to the site where you engaged with Web Monetized content;
    - The percentage of the number of visits to the site where you engaged with Web Monetized
      content out of your total number of visits to websites i.e.
      `100 * (number of monetized visits to site) / (total visits to websites)`; and
    - How much payment you've sent using Web Monetization providers via Payment Pointers on the site
      (as reported by the Web Monetization API to the browser), as well as the currencies of the
      payments.
  - How much time you’ve spent on sites while engaging with Web Monetized content;
  - The percentage of the time you've spent on sites while engaging with Web Monetized content out
    of the total time you’ve spent on websites i.e.
    `100 * (monetized time you've spent on websites) / (total time you've spent on websites)`;
  - How much payment you've sent using Web Monetization providers via Payment Pointers on websites
  (as reported by the Web Monetization API to the browser), as well as the currencies of the
  payments; and
- Web Monetized sites that you've spent less time on or sent less payment to compared to other Web
  Monetized sites you've visited (shown under the heading "Sites that could use some ❤️").

Additionally, the Akita Browser Extension adheres to the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program_policies/),
including its [Limited Use](https://developer.chrome.com/docs/webstore/program_policies#limited_use)
requirements regarding user data.

## 3. What information does Akita share?

None. All information that Akita collects is stored in the web browser's local storage, so it is
only accessible by those who have access to your computer. Akita does not upload or send your data
anywhere. It stores your data for the single purpose of showing your data to you in the extension
popup. If you uninstall the Akita browser extension from your browser, your data will be
**permanently deleted** and will not be recoverable.

## 4. How long does Akita retain your data?

Akita stores your data locally on your computer for as long as you have the Akita extension
installed. Akita does not back up your data nor create any copies of it. You can permanently delete
your data at any time by uninstalling Akita.

## 5. Which browser permissions does Akita use?

Akita uses the "storage" browser permission to store collected data locally on your computer. Akita
also has "host permissions" on all `http` and `https` sites, so that it can collect data relevant to
Web Monetization on the sites you visit. Akita does not collect data when you open files or
non-website pages in your web browser. To view the permissions Akita lists in its browser extension
manifest, go [here](https://github.com/esse-dev/akita/blob/master/manifest.json).

## 6. Where can I find Akita's source code?

Akita is open source, which means that Akita's code is publicly available. Akita accepts
[code contributions](https://github.com/esse-dev/akita/blob/master/CONTRIBUTING.md) and
[feedback](https://github.com/esse-dev/akita/issues/new/choose) from the GitHub community. All
versions of Akita's source can be found in
[Akita's GitHub code repository](https://github.com/esse-dev/akita).
