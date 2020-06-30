# ServiceWorker

This is a quick and simple implementation of a Javascript Service Worker, which can be used for making your web application load and function while the user is offline. When the user visits your web application for the first time, the Service Worker will seamlessly install and download all the relevent files for your app. The next time they visit the Service Worker will kick in automatically, and load files first from its cache.

Usage is very simple, just put all your files in a root and sub folders starting one level up from the Service Worker itself. This respository has been constructed to illustrate that layout, so just start with the examples and go from there.

Updates to your app are handled automatically by the Service Worker code, and the service based update detection files in the repo. The language used is PHP but can easily be adapted to other languages.

Note that in the example files the ServiceWorker.js file is not referenced directly, but instead is loaded via an `index.php` file. This is so that extra http headers can be added to the response with little trouble.

A Javascript PHP file is included as an example for how to include external dependencies. While not required for Service Workers in general, this helps the auto-update system detect files for download and caching. If you change one of the include files to a new version, be sure to update the PHP file as well.

You should not have to but if you wish to set the scope for the Service Worker, it can be set in `workerClient.js` in the root of the repo.
