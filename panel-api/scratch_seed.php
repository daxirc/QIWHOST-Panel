<?php

use App\Models\Customer;
use App\Models\HostingPackage;
use App\Models\HostingAccount;
use App\Models\Domain;
use Illuminate\Support\Facades\Hash;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Seeding default data...\n";

// 1. Seed Packages
if (HostingPackage::count() === 0) {
    HostingPackage::create([
        'name' => 'Basic Plan',
        'disk_space' => 2048,
        'bandwidth' => 20,
        'databases' => 2,
        'ftp_accounts' => 5,
        'email_accounts' => 5,
        'subdomains' => 5,
        'addon_domains' => 0,
        'price' => 4.99,
    ]);
    HostingPackage::create([
        'name' => 'Premium Plan',
        'disk_space' => 10240,
        'bandwidth' => 100,
        'databases' => 10,
        'ftp_accounts' => 20,
        'email_accounts' => 25,
        'subdomains' => 15,
        'addon_domains' => 5,
        'price' => 19.99,
    ]);
    echo "Service Plans seeded.\n";
} else {
    echo "Service Plans already exist.\n";
}

// 2. Seed Customer
if (Customer::count() === 0) {
    $cust = Customer::create([
        'name' => 'Ali Umar',
        'email' => 'ali@qiwhost.com',
        'username' => 'aliumar',
        'password' => Hash::make('ali12345'),
        'phone' => '+923001234567',
        'company' => 'AliTech Solutions',
        'city' => 'Lahore',
        'country' => 'Pakistan',
    ]);
    echo "Customer 'Ali Umar' seeded.\n";

    // 3. Seed Hosting Account Container
    $pkg = HostingPackage::first();
    $acc = HostingAccount::create([
        'customer_id' => $cust->id,
        'hosting_package_id' => $pkg->id,
        'domain' => 'aliumar.dev',
        'system_username' => 'alitech',
        'system_password' => Hash::make('ali12345'),
        'status' => 'active',
        'php_version' => '8.3',
        'setup_date' => now(),
    ]);
    echo "Hosting account 'aliumar.dev' seeded.\n";

    // Bind primary domain
    Domain::create([
        'hosting_account_id' => $acc->id,
        'domain' => 'aliumar.dev',
        'home_root' => "/home/alitech",
        'domain_root' => "/home/alitech/public_html",
        'domain_public' => "/home/alitech/public_html",
        'is_main' => true,
        'status' => 'active',
    ]);
    echo "Main domain seeded.\n";
} else {
    echo "Customer accounts already exist.\n";
}

echo "Successfully seeded!\n";
