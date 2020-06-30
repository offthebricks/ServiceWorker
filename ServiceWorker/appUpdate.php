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

//Provides to the ServiceWorker a list of all App files and versions
//The ServiceWorker uses this information to determine if updates to its cached version are required

function ignoreFile($path,$file){
	if($file == "Thumbs.db"){
		return TRUE;
	}
	$check = NULL;
	$ignoreAllBut = NULL;
	switch($path){
		case "/":
			$check = [".git",".gitignore",".htaccess","ServiceWorker"];
			break;
		default:
			//error_log("path: $path");
			break;
	}
	if($check && in_array($file,$check)){
		return TRUE;
	}
	if($ignoreAllBut && !in_array($file,$ignoreAllBut)){
		return TRUE;
	}
	return FALSE;
}

function JSONversion($outpath,$sub="/",$ignoreArr=NULL){
	if(!file_exists($outpath)){
		return FALSE;
	}
	$obj = array();
	$list = scandir($outpath.$sub);
	foreach($list as $file){
		if($file == "." || $file == ".."){
			continue;
		}
		if(ignoreFile($sub,$file)){
			continue;
		}
		$obj[] = new FileVersion($file,$outpath,$sub);
	}
	return $obj;
}

class FileVersion{
	public $name;
	public $version = 0;
	public $content = NULL;
	
	public function __construct($file = "", $path = "", $subdir = ""){
		if(!$file){
			return;
		}
		$this->name = $file;
		if(is_dir($path.$subdir.$file)){
			$this->content = JSONversion($path,$subdir.$file."/");
		}
		else{
			$this->version = filemtime($path.$subdir.$file);
		}
	}
}

###############################################################################

$outpath = realpath("../");

if(!file_exists($outpath)){
	http_response_code(500);
	exit;
}

$obj = JSONversion($outpath);
	
$obj = json_encode($obj);
header('Content-type: application/json; charset=utf-8');
header('Content-Length: '.strlen($obj));
echo $obj;
?>