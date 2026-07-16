# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

两个独立的游戏项目，无共享依赖，无构建工具。

## 项目结构

```
claude-project/
├── index.html              # Triple Triad 卡牌游戏（单文件，浏览器直接打开）
└── plane-shooter/          # 微信小程序飞机大战
    ├── app.js / app.json / app.wxss   # 小程序入口
    ├── project.config.json            # 微信开发者工具配置
    └── pages/game/                    # 游戏主页面
        ├── game.js                    # Canvas 2D 游戏逻辑（~870行）
        ├── game.wxml                  # 单 Canvas 节点
        └── game.wxss                  # Canvas 全屏样式
```

## 运行方式

- **Triple Triad**: 浏览器直接打开 `index.html`，无需服务器
- **飞机大战**: 使用微信开发者工具打开 `plane-shooter/` 目录，`compileType: "miniprogram"`，AppID `wx34a9b422d840dfb7`

## Triple Triad (`index.html`) 架构

单文件包含完整 CSS + HTML + JS，约 1700 行。

**游戏规则系统**（核心复杂度）:
- `Game` 对象持有全局状态：`board[9]`、`playerHand/opponentHand`、`rules`（Same/Plus/SameWall/Combo/Open）、`elementalBoard`
- 卡牌放置流程: `placeCard()` → `checkPlus()` → `checkSame()` → `checkBasicFlips()` → `comboChain()`（递归连锁翻转）
- Same 规则：放下的卡与 ≥2 个邻接卡数字相等则触发；Plus 规则：与 ≥2 个邻接卡数字之和相等则触发；Plus 优先级高于 Same
- SameWall 将棋盘边界视为值 10 的隐藏卡参与 Same 判定

**AI 系统**:
- `aiEasy()`: 随机选择合法落子
- `aiNormal()`: 1-step 前瞻，模拟每种落子后评估 `evaluateBoard()`（卡片数+卡片总值+角位占用）
- `aiHard()`: 2 层 Minimax（`minimax()`），深度 3，alpha-beta 剪枝
- AI 执行有 600ms 延迟模拟思考

**渲染**: 所有 DOM 操作通过 `renderBoard()`、`renderHand()`、`renderOpponentHand()` 等函数，支持翻转动画（`animateFlip()`）和放置动画

**卡牌数据库**: `CARD_DB` 包含 110 张 FF8 卡片，分 10 个等级，每张有 top/right/bottom/left 四向数值（A=10）和可选元素属性

## 飞机大战 (`plane-shooter/`) 架构

微信小程序 Canvas 2D 射击游戏，单页面应用。

**游戏循环**（`game.js`）:
- `loop()` → `update(dt)` + `render()`，通过 `requestAnimationFrame` 驱动
- `dt` 上限 33ms（≈30fps），防止切后台后帧跳跃

**碰撞系统**: `rectCollide()` 矩形碰撞（玩家-敌人/道具），`pointInRect()` 点-矩形碰撞（子弹-敌人）。玩家受击后有 invincibility frame（120 帧），受伤时缩 10px 的 hitbox 提高公平性

**对象池模式**: `bullets[]`、`enemies[]`、`powerups[]`、`particles[]`、`stars[]`（背景），每帧反向遍历 splice 清理

**敌人系统**: 3 种类型（small/medium/boss），血量/速度/分数不同；每 300 分可刷 boss；中等敌人正弦波移动，boss 也正弦波移动

**道具系统**: 击败敌人概率掉落（boss 100%、medium 30%、small 8%），类型：double（武器升级，最高 3 级，持续 600 帧）、shield（180 帧无敌）、bomb（清屏）

**关卡系统**: 每击毁 15 个敌人升级（最高 10 级），升级产生中心粒子爆发效果；敌人出生间隔随等级递减

**数据持久化**: 最高分存 `wx.getStorageSync('planeHighScore')`，仅 game over 时写入

**触控**: touchstart/touchmove/touchend 绑定在 Canvas 上，手指追踪到玩家位置，松手停止移动；game over 状态点击检测重启/分享按钮的 hitbox

## 注意

- `CLAUDE.md-bak.md` 是旧模板，与本项目无关，可删除
- 两个项目都没有测试、没有构建步骤、没有包管理
- 飞机大战的 AppID 硬编码在 `project.config.json` 中
