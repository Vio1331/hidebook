# Hidebook

纯静态手工卡包定制页。四层独立选择 Epsom、Togo、Swift、Evercolor、Mysore 与颜色；另可选择缝线、边油、装饰线和烫金文字。上方旋转预览，下方按部位选择，菜单及前后箭头切换并联动镜头。点击模型也可选中部位。皮料名称上悬停查看信息；手机长按名称查看。保存设计保存在浏览器，可下载 JSON。

## 运行与发布

`python3 -m http.server 8000 --directory dist`，打开 `http://localhost:8000`。

现有 GitHub Actions 在 main 推送后发布 dist 到 GitHub Pages。无构建步骤，无外部字体或脚本 CDN。

## 文件入口

- `dist/app.js`：定制状态、控件、镜头、皮片、跨层鞍式缝线及实体烫金。
- `dist/leather-geometry.js`：尺寸、曲线、独立开口、R0.5 折边、凹槽、连续斩孔路径。
- `dist/photo-materials.js`：五种皮料的材质参数与用户提供的说明。
- `dist/studio-lighting.js`：柔光环境及随观察方向移动的光源。
- `dist/style.css`、`dist/index.html`：界面和响应式布局。
- `dist/materials/`：保留用户上传原图；baked 中为重建材质。
- `dist/freeman.typeface.json`、`dist/Freeman-Regular.ttf`：Google Fonts 的 Freeman 本地字体与轮廓，许可证见 Freeman-OFL.txt。

## 模型

107 × 70 mm，底角 R10，四片皮厚各 1 mm。名称为底皮、钞位、卡位、下卡位。顶部只用同一皮料的半圆折边，无边油；钞位开口中央约 1.9 mm，沿缝线及底部闭合。各层顶边水平，开口的立体感只沿厚度方向。边油覆盖侧面、底面和折边端头，并微量回包到皮面。

装饰线距边 2 mm、宽 0.28 mm，真实几何凹槽深 0.10 mm；可关闭。缝线距边 3 mm、直径 0.45 mm。照片对应的连续 U 形路径约 68 针，按全路径闭合后实际间距约 3.356 mm（目标 3.38 mm），各层沿同一斩孔相位衔接；两侧顶部各回两针，返回线并排可见，并有绕顶固定线；麻线带实体螺旋纤维纹和微法线，截面压扁，端头埋入斩孔。

烫金支持最多 7 个英文或数字，包括大小写。Freeman 轮廓从皮面切出字形孔，凹肩宽 0.11 mm、深 0.22 mm，金箔为带浅倒角的实体几何，随皮片曲面贴合。留空时不显示。

## 材质重建

使用此次上传、文件名带尺寸的产品照片：Togo Ulysse 22×17；Epsom Tarmac 13.8×9.7；Evercolor H Sellier 11×9.2；Mysore Calvi Duo 10.5×7；Swift MagSafe 9.6×6.6。按实物像素宽度校准纹理尺度，裁掉缝线、五金和边缘光影，用对数亮度减低频去除曝光渐变，再以最小误差切缝扩展真实颗粒。Evercolor 改用黑色实拍内部区域，额外校正局部反差，避免区域明暗和颗粒深浅出现块状差异。Epsom 法线强度增加 55%。五种悬停图片统一为黑色，去低频光影并统一曝光。

图集覆盖 160 × 160 mm，法线 4096 px，颜色、粗糙度和作者用高度图 1024 px。所有贴图 ClampToEdge，不周期铺贴；每个皮片使用不同采样偏移。微纹通过物理高度估计生成法线，颜色只保留很弱的沟槽遮蔽，光泽由模型光源产生。照片反推不等同于扫描测量。

重建：`python3 scripts/build-materials.py`，然后 `python3 scripts/optimize-materials.py`，最后 `python3 scripts/build-samples.py`。需要 Pillow、NumPy、SciPy。重建先写无损中间图，再优化网页体积。

检查：`node scripts/check-geometry.mjs`，覆盖尺寸、四片开口无相交、折边半径、直顶边、面片内部边界全部接合、凹槽开关、连续针数和回针。

## 本轮验证

Chromium 实际渲染正面、侧面、实体烫金与 390px 手机页面；未出现脚本/着色器错误或手机横向溢出。完成五种皮料逐一切换、颜色、装饰线开关、手机皮料弹窗开关、非法字符过滤、7字限制和保存设计测试。几何检查覆盖 13,348 个层间不相交采样点。
