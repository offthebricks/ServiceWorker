/*
Copyright 2020 OffTheBricks - https://github.com/offthebricks/ServiceWorker
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0
 
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

//if in WorkerGlobalScope
if(self && self.importScripts){
	self.importScripts('./CacheManager.js');
	self.importScripts('./ServiceAPI.js');			//An API within your app; extend with your own functionality
}

var config = {
	app: {
		CacheEnabled: true,			//*******DISABLE THIS DURING DEVELOPMENT TO PREVENT YOUR CODE FROM BEING CACHED WHEN YOU DON'T WANT IT TO BE********* 
		CacheName: "SW_AppFiles"
	},
	api: {
		CacheName: "SW_ApiData"
	},
	logging: {
		log: true,			//is info logging enabled
		error: true			//is error logging enabled
	}
};


//Extend or replace this if more sophisticated logging is needed
var Logger = {
	log: function(str){
		if(config.logging.log){
			console.log(str);
		}
	},
	error: function(str, ex){
		if(config.logging.error){
			console.error(str);
		}
	}
};


self.addEventListener(
	'install',
	function(event){
		Logger.log("service worker install");
		//Perform install steps
		if(config.app.CacheEnabled){
			event.waitUntil(
				CacheManager.checkForUpdate()
			);
		}
	}
);

self.addEventListener(
	'activate',
	function(event){
		Logger.log("service worker activated");
		
		API.ClientResponse("sw","active");
	}
);

self.addEventListener(
	'fetch',
	function(event){
		let url = event.request.url, pos = url.indexOf("index.htm"), pos2 = url.indexOf("?");
		//double check that the 'scope' did fail, because it does sometimes
		if(url.indexOf(self.origin) !== 0){
			//not the correct domain, so just fetch
			event.respondWith(fetch(event.request));
			return;
		}
		//if loading the root of the app - update if your app main page is not 'index.htm'
		if(pos >= 0 && (pos2 < 0 || pos2 > pos)){
			//check if this is an API request
			if(event.request.method != "GET"){
				//Only handling POST by default, but remove or extend as needed
				if(event.request.method == "POST"){
					event.respondWith(API.ProcessPostRequest(event));
					return;
				}
				
				event.respondWith(
					new Response(
						"",
						{status: 405, statusText: "Method Not Allowed"}
					)
				);
				return;
			}
			else if(config.app.CacheEnabled){
				//check for app updates
				Logger.log("sw: fetch triggering sw update check");
				if(event.clientId){		//not yet well supported in browsers - https://ponyfoo.com/articles/serviceworker-messagechannel-postmessage
					self.clients.get(event.clientId).then(client => CacheManager.checkForUpdate(client));
				}
				else{
					CacheManager.checkForUpdate(null);
				}
			}
		}
		if(config.app.CacheEnabled){
			if(API.isCachedAsset(event.request.url)){
				event.respondWith(
					API.getCachedAsset(event.request)
				);
			}
			else{
				event.respondWith(
					CacheManager.getCachedResponse(event.request)
				);
			}
		}
		else{
			event.respondWith(fetch(event.request));
		}
	}
);

self.addEventListener(
	"message",
	function(e){
		Logger.log("sw msg rxd: "+e.data);
		if(e.clientId){
			API.ProcessClientRequest(JSON.parse(e.data,e.clientId));
		}
		else{
			API.ProcessClientRequest(JSON.parse(e.data));
		}
	},
	false
);
