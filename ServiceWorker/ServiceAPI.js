/*
Copyright 2021 OffTheBricks - https://github.com/offthebricks/ServiceWorker
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

var API = {
	Models: {
		ApiData: {
			id: "",					// id of the request to this API; provided by workerclient.js
			action: "",				// defined in Actions.Definitions
			name: "",				// name/path for the asset - defined by the caller
			type: "",				// mime content-type of the data being added
			data: ""				// blob or text data when adding
		}
	},
	
	RequestLimbo: null,
	
	GetCacheURL: function(key){
		if(!key){
			throw "BAD - missing key name";
		}
		let url = self.location.href;
		url = url.substring(0, url.lastIndexOf("ServiceWorker")) + "ServiceAPI/";
		return url + key;
	},
	
	Actions: {
		Definitions: {
			Ping: "ping",
			AddText: "addtext",			//can be new or existing
			AddBlob: "addblob",			//can be new or existing - blob must be provided as a data URL if passed via a 'ClientRequest'
			ListAssets: "list",
			GetText: "gettext"
		},
		isValid: function(action,isService){
			let i, list, actions = API.Actions.Definitions;
			list = Object.getOwnPropertyNames(actions);
			for(i=0; i<list.length; i++){
				if(actions[list[i]] == action){
					return true;
				}
			}
			return false;
		}
	},
	
	//Source: https://stackoverflow.com/a/30407959/5937052
	dataURLtoBlob: function(dataurl) {
		var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
		bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
		while(n--){
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new Blob([u8arr], {type:mime});
	},
	
	UpdateCacheData: async function(openedCache,apiData,isBlob){
		let data = apiData.data;
		let headers = new Headers({"Cache-Control": "max-age=0, must-revalidate"});
		//if a content type has been specified
		if(apiData.type){
			headers.append("Content-Type", apiData.type);
		}
		if(isBlob){
			data = API.dataURLtoBlob(data);
		}
		await openedCache.put(
			API.GetCacheURL(apiData.name),
			new Response(
				data,
				{status: 200, statusText: "OK", headers: headers}
			)
		);
	},
	
	ClientResponse: function(requestid,data){
		self.clients.matchAll().then(all => all.map(client => client.postMessage(JSON.stringify({id:requestid,api:data}))));
	},
	
	ProcessClientRequest: function(apiData,clientId){
		var openedCache, success;
		//if a missing or invalid api action request
		if(!API.Actions.isValid(apiData.action,false)){
			API.ClientResponse(apiData.id,"BAD");
			return;
		}
		//if this is a ping action request
		if(apiData.action == API.Actions.Definitions.Ping){
			API.ClientResponse(apiData.id,"Service API PING Request Detected");
			return;
		}
		//if this is a request to get the data in RequestLimbo
		if(apiData.action == API.Actions.Definitions.RequestLimbo){
			API.ClientResponse(apiData.id,API.RequestLimbo);
			API.RequestLimbo = null;
			return;
		}
		
		//open the api cache for processing
		caches.open(config.api.CacheName)
		.then(
			async function(cache){
				openedCache = cache;
				Logger.log('Opened cache:'+config.api.CacheName);
				
				if(apiData.action == API.Actions.Definitions.ListAssets){
					let i, list = [], resp, cacheURLs = await openedCache.keys();
					for(i=0; i<cacheURLs.length; i++){
						list.push(cacheURLs[i].url);
					}
					API.ClientResponse(apiData.id,list);
					return;
				}
				
				if(apiData.action == API.Actions.Definitions.AddText){
					API.UpdateCacheData(openedCache,apiData,false);
					API.ClientResponse(apiData.id,"OK");
					return;
				}
				
				if(apiData.action == API.Actions.Definitions.AddBlob){
					API.UpdateCacheData(openedCache,apiData,true);
					API.ClientResponse(apiData.id,"OK");
					return;
				}
				
				let request = new Request(API.GetCacheURL(apiData.name));
				let response = await openedCache.match(request);
				let cacheData = null;
				if(response){
					cacheData = await response.text();
				}
				
				if(apiData.action == API.Actions.Definitions.GetText){
					API.ClientResponse(apiData.id,cacheData);
					return;
				}
				
				// add code here if you wish for your API to be able to do some processing with the content of the asset itself
				
			}
		).catch(
			function(e){
				//if this is actually an exception, and not just intentionally breaking out of the promise
				if(e.message){
					API.ClientResponse(apiData.id,{error:e.message});
				}
			}
		);
	},
	
	//While a POST request can be accepted (after the ServiceWorker is installed), the app must still be loaded. This is a limitation enforced by the browsers due to security concerns. The app may initiate an appropriate response via a post-back flow.
	ProcessPostRequest: function(event){
		return event.request.text()
		.then(
			function(text){
		
				//store the body and load the app index.htm file
				Logger.log("sw-api rxd: "+text);
				API.RequestLimbo = text;
				
				let req = new Request(event.request.url);
				if(config.app.CacheEnabled){
					return CacheManager.getCachedResponse(req);
				}
				else{
					return fetch(req);
				}
				
			}
		).catch(
			function(e){
				//return api error message
				return new Response(e.message, {status: 500, statusText: "API Error"});
			}
		);
	},
	
	isCachedAsset: function(url){
		if(url.indexOf("/ServiceAPI/") >= 0){
			return true;
		}
		return false;
	},
	
	getCachedAsset: function(request){
		//strip any parameters from the request as they are only there to prevent browser caching
		let url = request.url
		if(url.indexOf("?") > 0){
			url = url.substring(0, url.indexOf("?"));
		}
		request = new Request(url);
		return caches.open(config.api.CacheName)
		.then(
			function(openedCache){
				Logger.log('Opened cache:'+config.api.CacheName);
				return openedCache.match(request);
			}
		)
		.then(
			function(response){
				if(response){
					return response;
				}
				return new Response(
					"Cached asset not found: " + url,
					{status: 404, statusText: "Not Found"}
				);
			}
		);
	}
};
