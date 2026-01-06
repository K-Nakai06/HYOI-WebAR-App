# HYOI WebAR App (PoC)

画像ターゲット（MindAR Image Tracking）を認識すると、3Dアバター（glb）が出現し、Idleアニメーションを再生するWebARのPoCです。  
（Unity不使用／ブラウザ実装）

---

## 機能（現時点）
- 画像ターゲット認識（MindAR）
- ターゲット検出でアバター表示 / ロストで非表示
- アバターのIdleアニメ再生（アニメーション入りglb）

---

## ディレクトリ構成
- HYOI-WebAR-App/
  - index.html
  - src/
    - main.js
    - mindar.js
    - avatar.js
    - ui.js
    - utils.js
  - assets/
    - targets.mind
    - Panda.glb


---

## 必要なもの
- PC：Windows（macOSでも可）
- ブラウザ：Chrome推奨
- スマホ：Chrome / Safari（実機テスト用）
- ローカルサーバ起動用にどちらか
  - Node.js（推奨）
  - Python（代替）

※カメラを使うため、実機では **HTTPS** でのアクセスを推奨します（ngrok等）。

---

## セットアップ

### 1) `targets.mind` の作成
1. MindARの Image Targets Compiler でターゲット画像をコンパイルし、`targets.mind` を作成
2. `assets/targets.mind` に配置

> ターゲット画像は特徴点（文字・模様・輪郭）が多いものほど安定します。  
> ぬいぐるみ等で特徴が少ない場合は、ステッカー（柄）を貼るのがおすすめです。

### 2) 3Dアバターの配置
- アニメーション入りの `avatar.glb` を `assets/avatar.glb` に配置してください。

---

## 起動方法（ローカル）
プロジェクト直下でローカルサーバを起動します（`file://` 直開きは不可）。

### Node.js（推奨）
```bash
cd HYOI-WebAR-App
npx http-server -p 8080
```

## 実機（スマホ）で確認する（HTTPS推奨）
- ngrok を使う
- ローカルサーバ（8080）起動後に別ターミナルで：

```bash
ngrok http 8080
```
- 出力された https://xxxxx.ngrok-free.app をスマホで開き、Start を押してカメラ許可 → ターゲットを映してください。
ngrokはアカウント作成とauthtoken登録が必要な場合があります。
ngrok config add-authtoken <YOUR_TOKEN> を実行してください。

## 使い方
1. ページを開く
2. Start を押す（カメラ起動）
3. 画像ターゲットを映す
4. status: target FOUND になり、アバターが表示されIdle再生されます
5. ターゲットを外すと status: target LOST でアバターが消えます
