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

var config = {
	appCacheName: "SW_AppFiles",
	updateCheckPeriod: 10000,
	lastUpdateCheck: null
};

var AppFileManager = (function(){
	var afm_self = {
		changeList: [],
		changeObj: function(todelete,url){
			return {
				need: !todelete,
				url: url
			};
		},
		processFolder: function(url,obj,add){
			for(var i=0; i<obj.length; i++){
				//if file
				if(obj[i].content === null){
					afm_self.changeList.push(new afm_self.changeObj(!add,url+obj[i].name));
				}
				//if folder
				else{
					afm_self.processFolder(url+obj[i].name+"/",obj[i].content,add);
				}
			}
		},
		getResource: function(obj,name){
			for(var i=0; i<obj.length; i++){
				if(obj[i].name !== name){
					continue;
				}
				//match found so return the resource
				return obj[i];
			}
			//no match found
			return false;
		},
		buildUpdatePlan: function(url,currentObj,refObj){
			var i, res;
			
			//delete currently cached resources which are no longer needed
			for(i=0; i<currentObj.length; i++){
				res = afm_self.getResource(refObj,currentObj[i].name);
				//if file
				if(currentObj[i].content === null){
					//if missing
					if(!res){
						afm_self.changeList.push(new afm_self.changeObj(true,url+currentObj[i].name));
					}
				}
				//if folder
				else{
					//if missing
					if(!res){
						//remove the folder
						afm_self.processFolder(url+currentObj[i].name+"/",currentObj[i].content,false);
					}
					else{
						//check folder contents
						afm_self.buildUpdatePlan(url+currentObj[i].name+"/",currentObj[i].content,res.content);
					}
				}
			}
			//add new needed resources
			for(i=0; i<refObj.length; i++){
				res = afm_self.getResource(currentObj,refObj[i].name);
				//if file
				if(refObj[i].content === null){
					//if missing or version is newer
					if(!res || refObj[i].version > res.version){
						afm_self.changeList.push(new afm_self.changeObj(false,url+refObj[i].name));
					}
				}
				//if folder
				else{
					//if missing
					if(!res){
						//add the whole folder
						afm_self.processFolder(url+refObj[i].name+"/",refObj[i].content,true);
					}
				}
			}
		}
	};
	return {
		checkForUpdate: function(){
			config.lastUpdateCheck = Date.now();
			var openedCache, versionData;
			return caches.open(config.appCacheName).then(
				function(cache){
					openedCache = cache;
					console.log('Opened cache:'+config.appCacheName);
					var request = new Request("appUpdate.php");
					return cache.match(request);
				}
			).then(
				async function(response){
					//if we don't have any cached files
					if(typeof(response) === 'undefined'){
						versionData = "[]";
					}
					else{
						versionData = await response.text();
					}
					//check with server as to whether files have changed
					var request = new Request("appUpdate.php");
					return fetch(request);
				}
			).then(
				async function(response){
					console.log("fetched app version");
					var newVersion = await response.text();
					if(versionData != newVersion){
						//cache essential files
						console.log("app file version change detected");
						afm_self.changeList = [];
						try{
							afm_self.buildUpdatePlan("../",JSON.parse(versionData),JSON.parse(newVersion));
							afm_self.changeList.push(new afm_self.changeObj(false,"appUpdate.php"));
							console.log("update plan: "+JSON.stringify(afm_self.changeList));
						}
						catch(e){
							if(e && e.message){
								console.error("build plan: "+e.message);
							}
							else{
								console.error("build plan error");
							}
							return true;
						}
						var urlsToCache = [], request;
						for(var i=0; i<afm_self.changeList.length; i++){
							//delete the item from the cache first
							console.log("deleting: "+afm_self.changeList[i].url);
							let success = await openedCache.delete(
								afm_self.changeList[i].url,
								{
									ignoreSearch: true,
									ignoreMethod: true,
									ignoreVary: true
								}
							);
							if(!success){
								console.log("failed to delete: "+afm_self.changeList[i].url);
							}
							if(afm_self.changeList[i].need){
								urlsToCache.push(afm_self.changeList[i].url);
							}
						}
						console.log("urls to cache: "+JSON.stringify(urlsToCache));
						return openedCache.addAll(urlsToCache);
					}
					//no changes
					return new Promise(
						function(resolve,reject){
							resolve(true);
						}
					);
				}
			).then(
				function(noupdate){
					if(typeof(noupdate) === 'boolean' && noupdate){
						console.log("no app changes");
					}
					else{
						console.log("app update applied");
						//tell client to refresh files
						//postMessage("sw-msg: app files updated");
					}
					console.log("done app update check");
				}
			).catch(
				function(e){
					console.error("error updating app files - offline?");
					console.log(JSON.stringify(e));
				}
			);
		}
	};
})();

self.addEventListener(
	'install',
	function(event){
		console.log("service worker install");
		//Perform install steps
		event.waitUntil(
			AppFileManager.checkForUpdate();
		);
	}
);

self.addEventListener(
	'activate',
	function(event){
		console.log("service worker activated");
		
		AppFileManager.checkForUpdate();
	}
);

self.addEventListener(
	'fetch',
	function(event){
		if(config.lastUpdateCheck + config.updateCheckPeriod < Date.now() || event.request.url.indexOf("index.htm") >= 0){
			console.log("sw: fetch triggering sw update check");
			AppFileManager.checkForUpdate();
		}
		event.respondWith(
			caches.match(event.request).then(
				function(response){
					if(response){
						console.log("sw: cached response to: "+event.request.url);
						return response;
					}
					console.log("sw: fetching response for: "+event.request.url);
					return fetch(event.request);
				}
			).catch(
				function() {
					return new Response("sw: requested resource not cached, and network error, unavailable, or file not found");
				}
			)
		);
	}
);

self.addEventListener(
	"message",
	function(e){
		//console.log(JSON.stringify(e.data));
		
		
	},
	false
);