# 行测真题库 · lx1120.me

一个无需云服务器的手机刷题阅读网站，基于 Quartz 5 和 GitHub Pages。

## 当前功能

- 搜索题干、选项和试卷名称，支持模块、年份、地区筛选。
- 按六大模块和年份浏览 515 套卷、58,890 道题。
- 答案与解析默认折叠，选项中的正确答案标记不提前显示。
- 手机布局、中文界面、本地字体；搜索使用 Web Worker，索引按需加载。
- 无需账号、API Key 或后端；暂不包含云端答题记录和评分。

## 本地运行

需要 Node.js 24、npm 10.9.2+ 和 Git。

```sh
npm ci --ignore-scripts
npm run site:fetch
npm run site:test
npm run site:build
npm run site:verify
npx quartz build --serve
```

题库固定版本记录在 `site/source.json`。下载步骤不执行题库内代码。

原数据存放在 `.work/question-bank`，生成文件存放在 `content`，均不提交到网站仓库。导入脚本使用 `.git/info/exclude` 排除生成文件，因为 Quartz 也读取 `.gitignore`，直接忽略 `content` 会构建出空站点。

## GitHub Pages 发布

1. 网站源码保存在 `xie-good/xingce-site`，正式首页由 `xie-good/xie-good.github.io` 发布。
2. 根站点仓库 **Settings → Pages → Source** 使用 **GitHub Actions**，Custom domain 保持 `lx1120.me`。
3. 根站点的 **Publish Xingce homepage** 工作流下载固定版本的网站源码和题库，测试、构建并发布到根路径。
4. 正式入口为 `https://lx1120.me/`，不需要添加 `/xingce-site/`；原来的 `/pyref/` 内容继续保留。
5. 网站源码升级后，同步根站点工作流中的源码提交号，再运行发布工作流。

## 域名与 HTTPS

`lx1120.me` 已使用 GitHub Pages 的域名解析，不需要为本次首页替换更改 DNS。

等待根站点 Pages 设置中的证书签发完成，再勾选 **Enforce HTTPS**。证书申请期间不要反复删除并重新添加域名。

本次不再使用 `proxymax.tech` 作为入口，无需继续添加它的 DNS 记录。

参考：[GitHub 官方域名说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)、[Quartz 官方发布说明](https://quartz.jzhao.xyz/hosting)。

## 数据说明

题目及原解析来自 [ERRRC/xingcezhenti](https://github.com/ERRRC/xingcezhenti)。原仓库注明两张公式图缺失，网站显示缺失占位，不补造公式。个别原题答案缺失也保留原样。

网站程序基于 MIT 许可的 [Quartz](https://github.com/jackyzha0/quartz)，保留原 `LICENSE.txt`。下面保留 Quartz 原始介绍。

---

# Quartz v5

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
