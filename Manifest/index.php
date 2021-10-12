<?php
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

class Manifest{
	public $start_url = ".";
	public $name;
	public $short_name;
	public $description;
	public $background_color;
	public $theme_color;
	
	public $display;
	public $icons = [];
	
	//not well supported features
	public $scope;
}

class DisplayTypes{
	public static $fullscreen = "fullscreen";
	public static $standalone = "standalone";
	public static $minimal_ui = "minimal-ui";		//similar to standalone except minimal browser navigation UI
	public static $browser = "browser";				//normal browser UI
}

class Icon{
	public $src;
	public $sizes;
	public $type;
	
	public function __construct($src, $size, $type = "image/png"){
		$this->src = $src;
		$this->sizes = $size."x".$size;
		$this->type = $type;
	}
}

#####################################################

$pathToRoot = "../";

$manifest = new Manifest();
$manifest->start_url = $pathToRoot."index.htm";
$manifest->name = "PWA by --Your Name Here--";
$manifest->short_name = "PWA";
$manifest->description = "A Progressive Web App (PWA) framework for anyone to use";
$manifest->background_color = "#1076ce";
$manifest->display = DisplayTypes::$standalone;
$manifest->theme_color = "#d3d3d3";

$manifest->icons[] = new Icon($pathToRoot."assets/appicon192.png", 192);
$manifest->icons[] = new Icon($pathToRoot."assets/appicon512.png", 512);

//not well supported features
$manifest->scope = $pathToRoot."index.htm";

#####################################################

header("Content-Type: application/manifest+json");
echo json_encode($manifest);
?>
