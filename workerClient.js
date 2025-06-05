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

var workerClient = {
	
	swActive: false,
	
	API: {
		requestCount: 0,
		
		requestModel: {
			id: 0,
			callback: null
		},
		
		requests: [],
		
		onServiceWorkerMessage: function(data){
			if(!data){
				return;
			}
			let i, req, requests = workerClient.API.requests;
			for(i=0; i<requests.length; i++){
				if(requests[i].id == data.id){
					req = requests[i];
					requests.splice(i,1);
					break;
				}
			}
			if(!req){
				//should never get here
				console.error("wc api rsp, no matching request: "+JSON.stringify(data));
			}
			else{
				req.callback(data.api);
			}
		},
		
		sendRequest: function(apiData,callback){
			if(!navigator.serviceWorker || !navigator.serviceWorker.controller){
				console.log("wc: service worker is not available");
				return false;
			}
			workerClient.API.requestCount++;
			let req = {
				id: workerClient.API.requestCount,
				callback: callback
			};
			apiData.id = req.id;
			workerClient.API.requests.push(req);
			navigator.serviceWorker.controller.postMessage(JSON.stringify(apiData));
			//console.log("wc api req: "+JSON.stringify(apiData));		//for debugging
			return true;
		}
	},

	init: function(callback){
		
		if(typeof(navigator.serviceWorker) === 'undefined'){
			console.log("Browser does not support service worker");
			callback();
			return;
		}
		
		//register the service worker
		console.log("attempting service worker registration on: ./");
		navigator.serviceWorker.register('ServiceWorker/',{scope:"./"})
		.then(
			function(registration){
				//Registration was successful
				console.log('ServiceWorker registration successful with scope: ', registration.scope);
				
				//update the service worker immediately instead of waiting for the browser to decide to do it
				//registration.update();			//not working - maybe not yet well supported in the browsers
				
				//wait for the service worker to become active
				var swReady = function(){
					if(!navigator.serviceWorker.controller){
						//need to reload the page
						window.location = window.location.href;
						return;
					}
					workerClient.swActive = true;
					callback();
				};
				setTimeout(swReady,100);
				
			},
			function(err){
				//registration failed
				console.log('ServiceWorker registration failed: ', err);
				callback();
			}
		);
		
		navigator.serviceWorker.addEventListener(
			"message",
			function(e){
				let obj;
				//console.log("sw-message: "+e.data);
				try{
					obj = JSON.parse(e.data);
				}
				catch(ex){
					if(e.data.indexOf("app files updated") < 0){
						console.error("non-JSON service worker message");
					}
				}
				workerClient.API.onServiceWorkerMessage(obj);
			},
			false
		);
	}
};
