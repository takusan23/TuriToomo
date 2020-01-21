import { GameMainParameterObject, RPGAtsumaruWindow } from "./parameterObject"

declare const window: RPGAtsumaruWindow

export function main(param: GameMainParameterObject): void {
	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["toomo", "shot", "se", "karaoke"]
	})
	let time = 60 // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 }
	scene.loaded.add(() => {
		// ここからゲーム内容を記述します

		// プレイヤーを生成します
		const player = new g.Sprite({
			scene: scene,
			src: scene.assets["toomo"],
			width: (scene.assets["toomo"] as g.ImageAsset).width,
			height: (scene.assets["toomo"] as g.ImageAsset).height,
			x: 50,
			y: 50
		})
		scene.append(player)

		// フォントの生成
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: g.FontFamily.SansSerif,
			size: 40
		})
		// スコア表示用のラベル
		const scoreLabel = new g.Label({
			scene: scene,
			text: "SCORE: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black"
		})
		scene.append(scoreLabel)

		// 残り時間表示用ラベル
		const timeLabel = new g.Label({
			scene: scene,
			text: "TIME: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black",
			x: 0.7 * g.game.width
		})
		scene.append(timeLabel)

		// 釣り糸
		const ito = new g.FilledRect({
			scene: scene,
			cssColor: "blue",
			width: 10,
			height: 10,
			x: player.x + 100,
			y: player.y + 20
		})
		scene.append(ito)

		// 押したとき
		let isFishing = false
		scene.pointDownCapture.add(() => {
			if (!isFishing) {
				isFishing = true
				ito.update.removeAll()
				ito.update.add(() => {
					if (g.game.height >= ito.height + 100) {
						ito.height += 10
					}
					ito.modified()
				})
				scene.setTimeout(() => {
					ito.update.removeAll()
					ito.update.add(() => {
						if (20 <= ito.height) {
							ito.height -= 10
						}
						ito.modified()
					})
				}, 1000)
				scene.setTimeout(() => {
					ito.update.removeAll()
					ito.height = 10
					ito.modified()
					isFishing = false
				}, 2000)
			}
		})

		scene.setInterval(() => {
			if (time >= 0) {
				scene.setTimeout(() => {
					const karaoke = new g.Sprite({
						scene: scene,
						src: scene.assets["karaoke"],
						width: (scene.assets["karaoke"] as g.ImageAsset).width,
						height: (scene.assets["karaoke"] as g.ImageAsset).height,
						x: g.game.width,
						y: g.game.random.get(150, g.game.height - (scene.assets["karaoke"] as g.ImageAsset).height)
					})
					scene.append(karaoke)
					karaoke.update.add(() => {
						karaoke.x -= 10
						karaoke.modified()
					})
					karaoke.update.add(() => {
						if (g.Collision.intersectAreas(karaoke, ito)) {
							karaoke.update.removeAll()
							karaoke.update.add(() => {
								let upSize = -10
								karaoke.y += upSize
								karaoke.modified()
								if (20 >= karaoke.y) {
									upSize = 0
									karaoke.update.removeAll()
									karaoke.destroy()
									g.game.vars.gameState.score += 10
									scoreLabel.text = `SCORE: ${g.game.vars.gameState.score}`
									scoreLabel.invalidate()
								}
							})
						}
					})
				}, g.game.random.get(100, 1000))
			}
		}, 1000)

		const updateHandler = () => {
			if (time <= 0) {
				// RPGアツマール環境であればランキングを表示します
				if (param.isAtsumaru) {
					const boardId = 1
					window.RPGAtsumaru.experimental.scoreboards.setRecord(boardId, g.game.vars.gameState.score).then(() => {
						window.RPGAtsumaru.experimental.scoreboards.display(boardId)
					})
				}
				scene.update.remove(updateHandler) // カウントダウンを止めるためにこのイベントハンドラを削除します
			}
			// カウントダウン処理
			time -= 1 / g.game.fps
			timeLabel.text = "TIME: " + Math.ceil(time)
			timeLabel.invalidate()
		}
		scene.update.add(updateHandler)
		// ここまでゲーム内容を記述します
	})
	g.game.pushScene(scene)
}
