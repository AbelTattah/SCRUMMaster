<?php

/**
 * templates/partials/auth-top.php
 *
 * Opening markup for the standalone authentication screens (sign in / sign
 * up). These pages have no sidebar or top bar — just the centred card.
 *
 * Variable: $title.
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#FFFFFF">
    <title><?= e($title ?? 'Scrum Master') ?></title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body class="auth-body">

<main class="auth-wrap">
