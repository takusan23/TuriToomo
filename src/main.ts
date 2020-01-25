import { GameMainParameterObject, RPGAtsumaruWindow } from "./parameterObject"
// 複数行表示に対応したやつ
import al = require("@akashic-extension/akashic-label")

declare const window: RPGAtsumaruWindow

export function main(param: GameMainParameterObject): void {

	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["toomo", "hari", "hari_hanten", "turi_2_ryunen", "turi_3_ryunen", "turi_4_ryunen", "turi_5_ryunen", "karaoke", "bakkure_1", "doutei_toomo", "inu", "irasutoya_kousya", "karaoke_2", "tuusinbo", "se"]
	})
	let time = 60 // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 }

	/** @param fishLevel 一度に釣れる量。 */
	let fishLevel = 2
	/** @param nowFishCount 釣れたかず */
	let nowFishCount = 0
	/** @param turibariList 釣り針の画像の配列 */
	const turibariList: g.Sprite[] = []

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

		// 釣り糸
		const ito = new g.FilledRect({
			scene: scene,
			cssColor: "black",
			width: 5,
			height: 220,
			x: player.x + 100,
			y: player.y + 20
		})
		scene.append(ito)

		/**
		 *  釣り針を増やす（足す）関数 。生成した画像は勝手に配列に入れておきますね。
		 */
		const createHari = () => {
			// 高さ。
			const yPos = ito.height + (50 - (turibariList.length * 20))
			// 針の方向。
			let assetName = "hari"
			if (turibariList.length % 2 === 0) {
				assetName = "hari"
			} else {
				assetName = "hari_hanten"
			}
			// 横の位置。
			let xPos = ito.x
			if (turibariList.length % 2 === 1) {
				xPos = ito.x - 30 // 画像の幅だけ引いてる。
			}
			const hari_ = new g.Sprite({
				scene: scene,
				src: scene.assets[assetName],
				x: xPos,
				y: yPos
			})
			scene.append(hari_)
			turibariList.push(hari_)
		}

		// まず２個
		createHari()
		createHari()

		// 押したとき
		// ここでは釣り糸を垂らして回収するまでをやってる。
		/** @param isFishing クリック連打対策用変数。釣り上げ動作以外で使ってない */
		let isFishing = false
		/** @param isMoveTop 釣り上げ動作中はtrue */
		let isMoveTop = false
		scene.pointDownCapture.add(() => {
			// クリック連打対策
			if (!isFishing) {
				isFishing = true
				isMoveTop = false
				ito.update.removeAll()

				// 釣り上げる
				ito.update.add(() => {
					isMoveTop = true
					if (80 <= ito.height) {
						ito.height -= 10
						turibariList.forEach(hari => {
							hari.y -= 10
							hari.modified()
							hari.invalidate()
						})
					}
					ito.modified()
				})

				// 海に戻す
				scene.setTimeout(() => {
					isMoveTop = false
					ito.update.removeAll()
					ito.update.add(() => {
						if (g.game.height >= ito.height + 100) {
							ito.height += 10
							turibariList.forEach(hari => {
								hari.y += 10
								hari.modified()
								hari.invalidate()
							})
						}
						ito.modified()
					})
					isFishing = false
					// 釣った魚も消す
					scene.setTimeout(() => {
						fishLabel.text = ""
						fishLabel.invalidate()
					}, 500)
					// いっぱいまで釣ったら釣れる数を増やす (釣れる数3で同時に3匹釣ったら→釣れる数を1足す)
					// ただし5個まで。
					if (nowFishCount === fishLevel && fishLevel < 5) {
						fishLevel++
						// 釣り針を足す
						createHari()
					}
					// 釣った数を戻す
					nowFishCount = 0
				}, 1000)

				//// その1秒後に引き上げる処理も消す。あとクリック対策(isFishing)をfalseへ。
				//// 引き上げたときに何かしたい場合はここに書いてね。
				//scene.setTimeout(() => {
				//	ito.update.removeAll()
				//	ito.height = 0
				//	ito.modified()
				//	isFishing = false
				//	// 釣った魚も消す
				//	scene.setTimeout(() => {
				//		fishLabel.text = ""
				//		fishLabel.invalidate()
				//	}, 500)
				//	// いっぱいまで釣ったら釣れる数を増やす (釣れる数3で同時に3匹釣ったら→釣れる数を1足す)
				//	// ただし5個まで。
				//	if (nowFishCount === fishLevel && fishLevel < 5) {
				//		fishLevel++
				//	}
				//	// 釣った数を戻す
				//	nowFishCount = 0
				//}, 2000)
			}
		})

		// 魚？生成。
		scene.setInterval(() => {
			// バックレカラオケ
			createFish({ asset: "karaoke", point: 100, name: "バックレカラオケ" })
			//	// 通知表
			createFish({ asset: "tuusinbo", name: "通信簿", point: 50 })
			//	// レモン
			createFish({ asset: "inu", name: "レモン", point: 100 })
		}, 1000)
		scene.setInterval(() => {
			// DT
			createFish({ asset: "doutei_toomo", name: "DT", point: 200 })
		}, 5000)
		scene.setInterval(() => {
			//	// 学校（唯一の減点要素）
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

		}): void => {
			// 制限時間
			if (time <= 0) {
				return null
			}
			scene.setTimeout(() => {
				// 魚生成
				const karaoke = new g.Sprite({
					scene: scene,
					src: scene.assets[data.asset],
					width: (scene.assets[data.asset] as g.ImageAsset).width,
					height: (scene.assets[data.asset] as g.ImageAsset).height,
					x: g.game.width,
					y: g.game.random.get(150, g.game.height - (scene.assets[data.asset] as g.ImageAsset).height)
				})
				// 追加
				scene.append(karaoke)
				// 適当に流す
				karaoke.update.add(() => {
					karaoke.x += data.speed ?? -10
					karaoke.modified()
				})
				// クリックしたら
				scene.pointDownCapture.add(() => {
					karaoke.update.add(() => {
						if (isMoveTop) {
							turibariList.forEach(hari => {
								if (g.Collision.intersectAreas(karaoke, hari)) {
									// 魚の動きを消す
									karaoke.update.removeAll()
									// 釣れた数を増やす
									nowFishCount++
									karaoke.update.add(() => {
										karaoke.y += -10
										karaoke.modified()
									})
								}
							})
						}
					})
				})

				// karaoke.update.add(() => {
				// 	// 当たったとき
				// 	if (g.Collision.intersectAreas(karaoke, ito)) {
				// 		if (nowFishCount < fishLevel) {
				// 			// 魚の動きを消す
				// 			karaoke.update.removeAll()
				// 			// 釣れた数を増やす
				// 			nowFishCount++
				// 			karaoke.update.add(() => {
				// 				// 上昇
				// 				karaoke.y = ito.height - 40
				// 				// 釣り針に引っかかった感じにするため重ねる。
				// 				// 何故か同時に釣り上げたとき向きが同じになってしまうのでtagに位置を入れてない場合のみ位置を入れるように。
				// 				if (karaoke.tag === undefined || karaoke.tag === null) {
				// 					if (nowFishCount % 2 === 1) {
				// 						karaoke.x = ito.x + karaoke.width - 70
				// 						// karaoke.angle = 20
				// 					} else {
				// 						karaoke.x = ito.x - karaoke.width + 20
				// 						// karaoke.angle = 340
				// 					}
				// 					karaoke.tag = karaoke.x
				// 				}
				// 				karaoke.modified()
				// 				if (20 >= karaoke.y) {
				// 					// 釣り上げた。魚削除など
				// 					if (data.point >= 0) {
				// 						// 正の数の場合は＋が省略されるので分岐
				// 						fishLabel.text += `${data.name} +${data.point}\n`
				// 					} else {
				// 						fishLabel.text += `${data.name} ${data.point}\n`
				// 					}
				// 					fishLabel.invalidate()
				// 					karaoke.update.removeAll()
				// 					karaoke.destroy()
				// 					// スコア表示
				// 					g.game.vars.gameState.score += data.point
				// 					scoreLabel.text = `SCORE: ${g.game.vars.gameState.score}`
				// 					scoreLabel.invalidate()
				// 				}
				// 			})
				// 		}
				// 	}
				// })
			}, data.interval ?? g.game.random.get(100, 1000))
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
