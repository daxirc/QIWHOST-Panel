<div style="border:1px solid #e2e8f0; border-radius:8px; padding:20px; font-family:sans-serif; max-width:500px;">
    
    <!-- Primary Domain -->
    <div style="margin-bottom:16px;">
        <div style="color:#888; font-size:12px; text-transform:uppercase; margin-bottom:4px;">Primary Domain</div>
        <div style="font-size:18px; font-weight:bold; color:#1a1a2e;">🌐 {$primaryDomain}</div>
    </div>

    <!-- Disk Usage -->
    <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#888; font-size:12px; text-transform:uppercase;">💾 Disk Space</span>
            <span style="font-size:12px; color:#444;">{$diskUsed} / {$diskTotal} ({$diskPercent}%)</span>
        </div>
        <div style="background:#e2e8f0; border-radius:999px; height:8px;">
            <div style="background:{$barColor}; width:{$diskPercent}%; height:8px; border-radius:999px; transition:width 0.3s;"></div>
        </div>
    </div>

    <!-- Bandwidth -->
    <div style="margin-bottom:20px;">
        <div style="color:#888; font-size:12px; text-transform:uppercase; margin-bottom:4px;">📡 Bandwidth Used</div>
        <div style="font-size:14px; color:#444;">{$bandwidthUsed}</div>
    </div>

    <!-- Login Button -->
    <a href="{$ssoLoginUrl}" target="_blank" style="
        display:block;
        width:100%;
        background:#f97316;
        color:#fff;
        border:none;
        border-radius:6px;
        padding:12px 20px;
        font-size:15px;
        font-weight:bold;
        cursor:pointer;
        text-align:center;
        text-decoration:none;
        box-sizing:border-box;
    ">
        🔑 Login to Hosting Panel
    </a>

</div>
