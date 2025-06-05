/*
Copyright 2025 OffTheBricks - https://github.com/offthebricks/ServiceWorker
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

var CacheManager = (function(){
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
			if(obj){
				for(var i=0; i<obj.length; i++){
					if(obj[i].name !== name){
						continue;
					}
					//match found so return the resource
					return obj[i];
				}
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
						//if this is an external resource
						if(currentObj[i].name.indexOf("http") === 0){
							afm_self.changeList.push(new afm_self.changeObj(true,currentObj[i].name));
						}
						//store with local path
						else{
							afm_self.changeList.push(new afm_self.changeObj(true,url+currentObj[i].name));
						}
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
					if(!res || (res.version > 0 && refObj[i].version > res.version)){
						//if this is an external resource
						if(refObj[i].name.indexOf("http") === 0){
							afm_self.changeList.push(new afm_self.changeObj(false,refObj[i].name));
						}
						else{
							afm_self.changeList.push(new afm_self.changeObj(false,url+refObj[i].name));
						}
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
		checkForUpdate: function(client){
			var openedCache, versionData;
			return caches.open(config.app.CacheName).then(
				function(cache){
					openedCache = cache;
					Logger.log('Opened cache:'+config.app.CacheName);
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
					Logger.log("fetched app version");
					var newVersion = await response.text();
					if(versionData != newVersion){
						//cache essential files
						Logger.log("app file version change detected");
						afm_self.changeList = [];
						try{
							afm_self.buildUpdatePlan("../",JSON.parse(versionData),JSON.parse(newVersion));
							afm_self.changeList.push(new afm_self.changeObj(false,"appUpdate.php"));
							Logger.log("update plan: "+JSON.stringify(afm_self.changeList));
						}
						catch(e){
							if(e && e.message){
								Logger.error("build plan: "+e.message);
							}
							else{
								Logger.error("build plan error");
							}
							return true;
						}
						var urlsToCache = [], request;
						for(var i=0; i<afm_self.changeList.length; i++){
							//delete the item from the cache first
							Logger.log("deleting: "+afm_self.changeList[i].url);
							let success = await openedCache.delete(
								afm_self.changeList[i].url,
								{
									ignoreSearch: true,
									ignoreMethod: true,
									ignoreVary: true
								}
							);
							if(!success){
								Logger.log("failed to delete: "+afm_self.changeList[i].url);
							}
							if(afm_self.changeList[i].need){
								urlsToCache.push(afm_self.changeList[i].url);
							}
						}
						Logger.log("urls to cache: "+JSON.stringify(urlsToCache));
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
						Logger.log("no app changes");
					}
					else{
						Logger.log("app update applied");
						if(client){
							//tell client to refresh files
							client.postMessage("app files updated 1");
						}
						else{
							self.clients.matchAll().then(all => all.map(client => client.postMessage("app files updated 2")));
						}
					}
					Logger.log("done app update check");
				}
			).catch(
				function(e){
					Logger.error("error updating app files - offline?", e);
				}
			);
		},
		
		getCachedResponse: function(request){
			return caches.match(request, {ignoreVary: true, ignoreSearch: true}).then(
				function(response){
					if(response){
						Logger.log("sw: cached response to: " + request.url);
						return response;
					}
					Logger.log("sw: fetching response for: " + request.url);
					return fetch(request);
				}
			).catch(
				function() {
					return new Response(
						"sw: requested resource not cached, and network error, unavailable, or file not found",
						{status: 503, statusText: "offline"}
					);
				}
			)
		}
	};
})();
