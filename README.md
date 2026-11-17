# 行测真题库 · proxymax.tech

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

1. 打开仓库 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。
2. 向 `main` 推送网站代码，或在 Actions 手动运行 **Deploy question bank**。
3. 工作流自动下载指定题库、测试、构建、验证本地链接，再部署 `public`。
4. 初始地址为 `https://xie-good.github.io/xingce-site/`。

## 绑定 proxymax.tech

先在 **Settings → Pages → Custom domain** 填写 `proxymax.tech` 并保存，再配置域名 DNS。

根域名添加以下四条 A 记录；主机名填 `@`，或按注册商提示留空表示根域名。

| 类型 | 主机名 | 值              |
| ---- | ------ | --------------- |
| A    | @      | 185.199.108.153 |
| A    | @      | 185.199.109.153 |
| A    | @      | 185.199.110.153 |
| A    | @      | 185.199.111.153 |

可选：`www` 添加 CNAME，值为 `xie-good.github.io`。保留已有 `lx`、邮件及其他无关子域名记录。根域名若已有网站记录，确认后再替换冲突值。

等待 GitHub DNS 检查和证书就绪后勾选 **Enforce HTTPS**。无需更换 Nameservers。

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
