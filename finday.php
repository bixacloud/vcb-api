<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
date_default_timezone_set('Asia/Ho_Chi_Minh');

include "vendor/autoload.php";
include "cors.php";
include "VietCombank.php";




$tk = '';
$mk = '';
$stk = '';

$app = new VietCombank($tk, $mk, $stk);


$data = file_get_contents('php://input');

$type = $_GET['type']; $type = abs($type);



// login
if($type == '1'){
$result = $app->doLogin($tk,$mk);
echo json_encode($result);
}


if($type == '2'){ // nhập otp
    $otp = htmlspecialchars($_GET['otp']);
    	echo json_encode($app->submitOtpLogin($otp));
}

if($type == '3'){ // check lsgd
    to9xvn:
    $from = date("d/m/Y");
   $result = $app->getHistories($from,$stk, 0);
   $json_daubuoi = json_encode($result);
   ## chức năng đăng con mẹ nó nhập tự động ###
$find = "đang được truy cập trên thiết bị";
if(strpos($json_daubuoi, $find) !== false){
 $resultcc = $app->doLogin($tk,$mk); 
 goto to9xvn;
}
$find = "đăng nhập đã hết hiệu lực";
if(strpos($json_daubuoi, $find) !== false){
 $resultcc = $app->doLogin($tk,$mk); 
 goto to9xvn;
}
# rgTHAY ĐỔI tý mấy cái chữu cái loằn gngoằng
$json_daubuoi = str_replace("Amount", "amount", $json_daubuoi);
$json_daubuoi = str_replace("Reference", "transactionID", $json_daubuoi);
$json_daubuoi = str_replace("Description", "escription", $json_daubuoi);
   # in ra kq cuối nè đm
  exit($json_daubuoi);
}













