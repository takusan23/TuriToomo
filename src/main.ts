import { GameMainParameterObject, RPGAtsumaruWindow } from "./parameterObject"
import al = require("@akashic-extension/akashic-label")

declare const window: RPGAtsumaruWindow

export function main(param: GameMainParameterObject): void {

	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["toomo", "karaoke", "bakkure_1", "doutei_toomo", "inu", "irasutoya_kousya", "karaoke_2", "tuusinbo", "se"]
	})
	let time = 60 // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 }

	/** @param fishLevel 一度に釣れる量。 */
	let fishLevel = 2
	// 釣れたかず
	let nowFishCount = 0

	scene.loaded.add(() => {

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
			textColor: "black",
			x: (g.game.width - 200)
		})
		scene.append(scoreLabel)

		// 残り時間表示用ラベル
		const timeLabel = new g.Label({
			scene: scene,
			text: "TIME: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black",
			x: 10
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

		// 釣った魚
		const fishLabel = new al.Label({
			scene: scene,
			text: "",
			fontSize: 15,
			font: font,
			width: 200,
			x: scoreLabel.x,
			y: scoreLabel.y + 20
		})
		scene.append(fishLabel)

		// 押したとき
		// ここでは釣り糸を垂らして回収するまでをやってる。
		let isFishing = false
		scene.pointDownCapture.add(() => {
			// クリック連打対策
			if (!isFishing) {
				isFishing = true
				ito.update.removeAll()
				// まず下げる
				ito.update.add(() => {
					if (g.game.height >= ito.height + 100) {
						ito.height += 10
					}
					ito.modified()
				})
				// 1秒後に引き上げる
				scene.setTimeout(() => {
					ito.update.removeAll()
					ito.update.add(() => {
						if (20 <= ito.height) {
							ito.height -= 10
						}
						ito.modified()
					})
				}, 1000)
				// その1秒後に引き上げる処理も消す。あとクリック対策(isFishing)をfalseへ。
				// 引き上げたときに何かしたい場合はここに書いてね。
				scene.setTimeout(() => {
					ito.update.removeAll()
					ito.height = 10
					ito.modified()
					isFishing = false
					// 釣った魚も消す
					scene.setTimeout(() => {
						fishLabel.text = ""
						fishLabel.invalidate()
					}, 500)
					// いっぱいまで釣ったら釣れる数を増やす
					// ただし5個まで。
					if (nowFishCount === fishLevel && fishLevel < 5) {
						fishLevel++
					}
					// 釣った数を戻す
					nowFishCount = 0
				}, 2000)
			}
		})

		// 魚？生成。
		scene.setInterval(() => {
			// バックレカラオケ
			createFish({ asset: "karaoke", point: 100, name: "バックレカラオケ" })
			// 通知表
			createFish({ asset: "tuusinbo", name: "通信簿", point: 50 })
			// レモン
			createFish({ asset: "inu", name: "レモン", point: 100 })
		}, 1000)
		scene.setInterval(() => {
			// DT
			createFish({ asset: "doutei_toomo", name: "DT", point: 200 })
		}, 5000)
		scene.setInterval(() => {
			// 学校（唯一の減点要素）
			createFish({ asset: "irasutoya_kousya", name: "スクーリング", point: -100 })
		}, 2000)

		/**
		 * 魚を作成する関数。
		 * 制限時間を過ぎた場合、戻り値はnullになります。
		 */
		const createFish = (data: {

			/** @param asset 必須 アセット（画像）の名前。先にシーン作成時のassetIdsに追加する必要があります。 */
			asset: string,

			/** @param speed 自由 移動速度です。マイナスで頼んだ。省略時-10です */
			speed?: number,

			/** @param point 必須 釣り上げたときの加点数です。 */
			point: number

			/** @param  interval 任意 出現間隔です。省略時 100~1000 からランダムです。 */
			interval?: number

			/** @param  name 必須 魚の名前。釣り上げたときに表示させます。 */
			name: string

		}): g.Sprite => {
			// 制限時間
			if (time <= 0) {
				return null
			}
			// 魚生成
			const karaoke = new g.Sprite({
				scene: scene,
				src: scene.assets[data.asset],
				width: (scene.assets[data.asset] as g.ImageAsset).width,
				height: (scene.assets[data.asset] as g.ImageAsset).height,
				x: g.game.width,
				y: g.game.random.get(150, g.game.height - (scene.assets[data.asset] as g.ImageAsset).height)
			})
			scene.setTimeout(() => {
				// 追加
				scene.append(karaoke)
				// 適当に流す
				karaoke.update.add(() => {
					karaoke.x -= 10
					karaoke.modified()
				})
				karaoke.update.add(() => {
					// 当たったとき
					if (g.Collision.intersectAreas(karaoke, ito)) {
						if (nowFishCount < fishLevel) {
							// 魚の動きを消す
							karaoke.update.removeAll()
							// 釣れた数を増やす
							nowFishCount++
							karaoke.update.add(() => {
								// 上昇
								let upSize = data.speed ?? -10 // ないとき-10
								karaoke.y += upSize
								karaoke.modified()
								if (20 >= karaoke.y) {
									// 釣り上げた。魚削除など
									if (data.point >= 0) {
										// 正の数の場合は＋が省略されるので分岐
										fishLabel.text += `${data.name} +${data.point}\n`
									} else {
										fishLabel.text += `${data.name} ${data.point}\n`
									}
									fishLabel.invalidate()
									upSize = 0
									karaoke.update.removeAll()
									karaoke.destroy()
									// スコア表示
									g.game.vars.gameState.score += data.point
									scoreLabel.text = `SCORE: ${g.game.vars.gameState.score}`
									scoreLabel.invalidate()
								}
							})
						}
					}
				})
			}, data.interval ?? g.game.random.get(100, 1000))
			return karaoke
		}

		/** 乱数生成機。長いので短くするだけで中身はAkashic Engineのものを利用している。 */
		const random = (min: number, max: number): number => {
			return g.game.random.get(min, max)
		}

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
