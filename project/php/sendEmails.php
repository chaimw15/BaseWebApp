<?php
  require 'vendor/autoload.php';
  use \Mailjet\Resources;
  $mj = new \Mailjet\Client('6f9416b727cffc0d89dec6b4a24b83ab','bce7eb357dbe5795e238a0f098f13c4e',true,['version' => 'v3.1']);
  $body = [
    'Messages' => [
      [
        'From' => [
          'Email' => "chaimw@hotmail.ca",
          'Name' => "Chaim"
        ],
        'To' => [
          [
            'Email' => "chaimw@hotmail.ca",
            'Name' => "Chaim"
          ]
        ],
        'Subject' => "Greetings from Mailjet.",
        'TextPart' => "My first Mailjet email",
        'HTMLPart' => "<h3>Dear passenger 1, welcome to <a href='https://www.mailjet.com/'>Mailjet</a>!</h3><br />May the delivery force be with you!",
        'CustomID' => "AppGettingStartedTest"
      ]
    ]
  ];
  $response = $mj->post(Resources::$Email, ['body' => $body]);
  $response->success() && var_dump($response->getData());
?>