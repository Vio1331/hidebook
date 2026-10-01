# 当前材质来源与比例校准

本轮全部从 Hermès 官方卡包照片取样，优先使用用户给出的中国官网卡包分类。照片上产品的已知宽度用于标定采样块所覆盖的毫米数；竖放的 Calvi 使用官方 70 mm 短边。图集统一为 140 × 140 mm / 2048 px，并以同一物理 UV 密度贴到 107 × 70 mm 卡包上。原始照片仅 800 px；生成 2048 px 不代表原始扫描精度。

| 皮料 | 官方卡包 | 标定尺寸与照片边宽 | 链接 |
|---|---|---|---|
| Evercolor | Citizen Twill，H088017CAAE | 105 mm / 574 px | https://www.hermes.cn/cn/zh/product/citizen-twill卡包-H088017CAAE/ |
| Epsom | Calvi Duo，H083035CKI2 | 短边 70 mm / 358 px | https://www.hermes.cn/cn/zh/product/calvi-duo短卡包-H083035CKI2/ |
| Swift | Hermèsnap，H085854CK37 | 97 mm / 335 px | https://www.hermes.cn/cn/zh/product/hermesnap卡包-H085854CK37/ |
| Mysore | Calvi，H044166CK28 | 短边 70 mm / 330 px | https://www.hermes.cn/cn/zh/product/calvi卡包-H044166CK28/ |
| Togo 参考 | Rooroo 3CC，H078523CAAA | 70 mm / 416 px | https://www.hermes.com/sg/en/product/hermes-rooroo-3cc-card-holder-H078523CAAA/ |

Togo 的重要边界：未在中国卡包分类中找到足够明确的单一 Togo 款；Rooroo 官方列出 Togo、Epsom、Swift、Mysore 四种皮料，采样绿色外片按颗粒外观推定为 Togo。官方没有逐片标注，这一项不应视为已核实的单一皮料扫描。

具体裁切框、原图产品宽度、图集毫米数保存在 `scale-calibration.json`。仅提取无文字、五金、缝线的皮面。去除低频照片光照后重建浅沟槽、法线与粗糙度，色彩由用户选择。比例为摄影估计，透视、皮面曲率和批次仍会造成误差。

已对照官网卡包正面图检查颗粒大小、开口比例与细缝线；形状按用户给定规格，不复制官网卡包的标识或五金。
