[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

# PolarRec (Zotero Plugin)

PolarRec is an academic resource recommendation engine, tailor-made for the [Zotero](https://www.zotero.org/) research assistant platform. Given a collection of target academic resources (such as papers of interest to the user), PolarRec utilises publicly available data including authors, conference names, publication dates, citations and citation counts to collect and generate recommended resources for the user.

The PolarRec Zotero Plugin is a Zotero plugin / add-on with a simple user interface that allows users to interact with the PolarRec service and get recommendations based on items in their Zotero library. Visit the [PolarRec](https://github.com/jyjulianwong/PolarRec) code repository to learn more about the recommendation engine and web API that powers this plugin.

# Installing the plugin

To use the plugin, you need to have Zotero (6.0 or above) installed on your device. Instructions on how to install the Zotero client application can be found [here](https://www.zotero.org/download/).

To install a stable build of the plugin, visit the [Releases](https://github.com/jyjulianwong/PolarRec-Zotero-Plugin/releases) page of the code repository, find the latest stable version, and download the `polarrec-zotero-plugin.xpi` file from that version.

In the Zotero application, select "Tools => Add-ons". Select the options button on the top right-hand corner of the dialog, and select "Install Add-on From File". Select the `.xpi` file that was downloaded earlier. Zotero should then proceed to integrate and enable the plugin automatically.

# Getting started with development

Before getting started with development, ensure that Node.js and npm have been installed on your device. You will also need to build the PolarRec web API locally, since the plugin connects with the local version of the API when run in development mode, i.e. `NODE_ENV=development`. Instructions on how to build the web API can be found [here](https://github.com/jyjulianwong/PolarRec).

The following examples demonstrate the process of compiling the application using a Bash terminal.

Clone the repository onto your local device.
```shell
git clone https://github.com/jyjulianwong/PolarRec-Zotero-Plugin.git
cd PolarRec-Zotero-Plugin
```

Install the package dependencies.
```shell
npm i
```

The following procedures need only be done once as part of the setup process for development. These steps are here to make the development and compilation process more convenient.

Ensure that the Zotero application is closed. In your file explorer, open your Zotero profile directory (which can be found [here](https://www.zotero.org/support/kb/profile_directory)). The following two steps have to be completed within this directory:

*   Open the `prefs.js` file. Remove the two lines that contain `extensions.lastAppBuildId` and `extensions.lastAppVersion` respectively. Save the file changes.
*   Open the `extensions` directory. Create a file with no extension titled `PolarRec-Zotero-Plugin@jyjulianwong.com`. The contents of the file should be set to the following via a text editor: `/absolute/path/to/repository/builds/addon`. Save the file.

These instructions have been adapted from the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) documentation. The original instructions can be found [here](https://zotero.yuque.com/staff-gkhviy/developer/skzm5s).

Compile the plugin and restart the Zotero application.
```shell
npm run restart
```

The above command builds the plugin with any latest code changes, and restarts the Zotero application. The Zotero application should know to find the `/builds/addon` directory in this repository in order to locate the latest development build of the plugin rather than the stable release that may have been already installed on your device.