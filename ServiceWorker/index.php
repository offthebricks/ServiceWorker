<?php
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

//simple proxy to include the ServiceWorker.js file so that we can also include the service worker allowed header

$servername = $_SERVER['SERVER_NAME'];
if(isset($_SERVER['HTTP_HOST']) && $_SERVER['HTTP_HOST']){
	$servername = $_SERVER['HTTP_HOST'];
}
$servername .= $_SERVER["REQUEST_URI"];
$servername = substr($servername,0,strpos($servername,"ServiceWorker"));
//header("Service-Worker-Allowed: https://$servername");
header("Service-Worker-Allowed: https://dev.offthebricks.com/Apps/Notes/");
header("Content-Type: application/javascript");

echo file_get_contents("ServiceWorker.js");
?>