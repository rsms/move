<?
$msg = '<html>Moved to <a href="https://github.com/rsms/move/raw/stable/web/move.js">https://github.com/rsms/move/raw/stable/web/move.js</a></html>';
header('HTTP/1.1 301 Moved Permanently');
header('Content-Length: '.strlen($msg));
header('Location: https://github.com/rsms/move/raw/stable/web/move.js');
?>