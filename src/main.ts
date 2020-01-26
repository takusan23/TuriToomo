import { GameMainParameterObject, RPGAtsumaruWindow } from "./parameterObject"
// 複数行表示に対応したやつ
import al = require("@akashic-extension/akashic-label")

declare const window: RPGAtsumaruWindow

export function main(param: GameMainParameterObject): void {

	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		// tslint:disable-next-line: max-line-length
		assetIds: ["toomo", "nami", "nami_2", "nami_3", "hari", "hari_hanten", "karaoke", "bakkure_1", "doutei_toomo", "inu", "irasutoya_kousya", "karaoke_2", "tuusinbo", "korean", "launch", "taoru", "GET", "GET_Short"]
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
	/** @param fishList 生成した魚の配列 */
	const fishList: g.E[] = []
	/** @param turibariXposList 釣り針の横の位置の配列 */
	const turibariXposList: number[] = []
	/** @param turibariXposList 釣り針の縦の位置の配列 */
	const turibariYposList: number[] = []

	/**
	 * この関数はタイトル用のSceneを生成します。
	 * @returns 生成したSceneです。
	 */
	const createTitleScene = (): g.Scene => {
		const titlescene = new g.Scene({
			game: g.game,
			// このシーンで利用するアセットのIDを列挙し、シーンに通知します
			assetIds: ["title"]
		})
		// 読み込んだら
		titlescene.loaded.add(() => {
			// タイトル画像を召喚します
			const titleImage = new g.Sprite({
				scene: titlescene,
				src: titlescene.assets["title"]
			})
			titlescene.append(titleImage)
		})
		return titlescene
	}

	// タイトル表示
	const titleScene = createTitleScene()
	titleScene.loaded.add(() => {
		// 5秒経過すればゲーム開始。
		titleScene.setTimeout(() => {
			// ゲームロードできた
			scene.loaded.add(() => {

				// 多分放送画面が暗いと文字が見えないので水色をバックに
				const blueBack = new g.FilledRect({
					scene: scene,
					cssColor: "teal",
					width: g.game.width,
					height: g.game.height,
					opacity: 0.3
				})
				scene.append(blueBack)

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

				// 波の生成
				// 長くなったので関数へ
				createWave(scene)

				// フォントの生成
				const font = new g.DynamicFont({
					game: g.game,
					fontFamily: g.FontFamily.SansSerif,
					size: 40
				})
				// スコア表示用のラベル
				const scoreLabel = new g.Label({
					scene: scene,
					text: "点数: 0",
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
					turibariXposList.push(xPos)
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
							if (100 <= ito.height) {
								ito.height -= 10
								// 釣り針上げる
								turibariList.forEach(hari => {
									hari.y -= 10
									hari.modified()
									hari.invalidate()
								})
								// 魚を釣る。こっちに持ってきた。ずれるので
								fishList.forEach(fish => {
									if ((fish.tag as FishTag).isFished) {
										// 釣り上げる～
										fish.y += -10
										fish.modified()
										// 縦の位置もずらす
										// ずらさないとあとから釣れた魚の位置がおかしくなるため
										turibariYposList.splice(0)
										turibariList.forEach(hari => {
											turibariYposList.push(hari.y - 10)
										})
									}
								})
							}
							ito.modified()
						})

						// 海に戻す
						scene.setTimeout(() => {
							isMoveTop = false
							fishList.forEach(fish => {
								if ((fish.tag as FishTag).isFished) {
									(fish.tag as FishTag).isEnd = true
								}
							})
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
					}
				})

				/**
				 * 魚のtagに付けるオブジェクト。
				 * 名前や加点ポイント、釣り上げたかどうかなどが入っている。
				 */
				interface FishTag {
					/** @param isFished 釣り上げられたらtrue */
					isFished: boolean,
					/** @param isEnd もう釣り上げて存在しないときtrue */
					isEnd?: boolean,
					/** @param point 加点ポイント */
					point: number,
					/** @param name 釣ったときに表示する名前 */
					name: string,
					/** @param fishCount 釣ったときに何番目に釣れたかを入れる。 */
					fishCount?: number
					/** @param isText テキストの場合true（例：令和2020年） */
					isText?: boolean
				}

				/**
				 * createFish()の引数で使うオブジェクト。
				 */
				interface FishObj {
					/** @param asset 必須（画像を表示させる場合は） アセット（画像）の名前。先にシーン作成時のassetIdsに追加する必要があります。 */
					asset?: string,
					/** @param speed 自由 移動速度です。マイナスで頼んだ。省略時-10です */
					speed?: number,
					/** @param point 必須 釣り上げたときの加点数です。 */
					point: number,
					/** @param  name 必須 魚の名前。釣り上げたときに表示させます。 */
					name: string,
					/** @param  text 必須（文字を流す場合は） 魚の名前。釣り上げたときに表示させます。 */
					text?: string
				}

				// 押したとき。釣ります！
				scene.pointDownCapture.add(() => {
					// 配列全消し。高さの値を入れ直す
					turibariYposList.splice(0)
					turibariList.forEach(hari => {
						turibariYposList.push(hari.y)
					})
					scene.update.add(() => {
						fishList.forEach(fish => {
							turibariList.forEach(hari => {
								// まだ釣り上げていない場合
								// 魚のtagにつけるオブジェクトに釣り上げたかどうがの値がfalseで
								// それと引き上げたときのみ動くように
								// それと同時に釣り上げる限界数より今釣ってる数のほうが小さい場合に
								if ((fish.tag as FishTag).isFished === false && isMoveTop && (nowFishCount < fishLevel)) {
									// 当たり判定。
									if (g.Collision.intersectAreas(fish, hari)) {
										// 釣り上げた判定に使う。
										(fish.tag as FishTag).isFished = true
										const data = (fish.tag as FishTag)
										// 魚の動きを消す
										fish.update.removeAll();
										// 釣れた数を増やす。のちに釣り針を増やすのに比較で使う。
										(fish.tag as FishTag).fishCount = nowFishCount
										// 初期の縦の位置設定
										// console.log(turibariYposList[(fish.tag as FishTag).fishCount])
										fish.y = turibariYposList[(fish.tag as FishTag).fishCount];

										// 音を鳴らしてみた
										// そーす：https://www.youtube.com/watch?v=wWqhBQVLB5I
										(scene.assets["GET_Short"] as g.AudioAsset).play()

										nowFishCount++
										fish.modified()
										fish.update.add(() => {
											// 釣れた魚の位置合わせ
											// これで針と魚が重なるようになる。
											fish.x = turibariXposList[(fish.tag as FishTag).fishCount]
											if ((fish.tag as FishTag).fishCount % 2 === 1) {
												fish.x = turibariXposList[(fish.tag as FishTag).fishCount] - (fish.width / 2)
											}
											// なんとなく角度をつけてみる
											if ((fish.tag as FishTag).fishCount % 2 === 0) {
												fish.angle = 20
											} else {
												fish.angle = 340
											}
											// 更新
											fish.modified()
											if (data.isEnd !== undefined) {
												// 釣り上げた。魚削除など
												if (data.point >= 0) {
													// 正の数の場合は＋が省略されるので分岐
													fishLabel.text += `${data.name} +${data.point}\n`
												} else {
													fishLabel.text += `${data.name} ${data.point}\n`
												}
												fishLabel.invalidate()
												fish.update.removeAll()
												fish.destroy()
												// 加点＋スコア表示
												// ただし0より小さくならないように
												if (g.game.vars.gameState.score + data.point >= 0) {
													g.game.vars.gameState.score += data.point
													scoreLabel.text = `点数: ${g.game.vars.gameState.score}`
													scoreLabel.invalidate()
												}
											}
										})
									}
								}
							})
						})
					})
				})

				/**
					* 魚を作成する関数。
					* 制限時間を過ぎた場合、戻り値はnullになります。
					*/
				const createFish = (data: FishObj): void => {
					// 制限時間
					if (time <= 0) {
						return null
					}
					// 魚生成 or 文字生成（例：令和2020年）
					let karaoke: g.E
					if (typeof data.asset !== "undefined") {
						// 魚
						karaoke = new g.Sprite({
							scene: scene,
							src: scene.assets[data.asset],
							width: (scene.assets[data.asset] as g.ImageAsset).width,
							height: (scene.assets[data.asset] as g.ImageAsset).height,
							x: g.game.width,
							y: g.game.random.get(150, g.game.height - (scene.assets[data.asset] as g.ImageAsset).height)
						})
					} else {
						// 文字
						karaoke = new g.Label({
							scene: scene,
							font: font,
							text: data.text,
							fontSize: 20,
							x: g.game.width,
							y: g.game.random.get(150, g.game.height - 20)
						})
					}

					// 追加
					scene.append(karaoke)
					// 適当に流す
					karaoke.update.add(() => {
						karaoke.x += data.speed ?? -10
						karaoke.modified()
					})
					fishList.push(karaoke)

					// 魚の情報を
					const tag: FishTag = {
						isFished: false,
						point: data.point,
						name: data.name,
						isText: (typeof data.text !== "undefined")
					}
					// 入れる
					karaoke.tag = tag
				}

				/** 乱数生成機。長いので短くするだけで中身はAkashic Engineのものを利用している。JSの物を使うとタイムシフトでの動作がおかしくなるためだって */
				const random = (min: number, max: number): number => {
					return g.game.random.get(min, max)
				}

				const karaokeObj: FishObj = { asset: "karaoke", point: 200, name: "バックレカラオケ" }
				const tuusinboObj: FishObj = { asset: "tuusinbo", name: "通信簿", point: 100 }
				const inuObj: FishObj = { asset: "inu", name: "レモン", point: 200 }
				const dtObj: FishObj = { asset: "doutei_toomo", name: "DT", point: 500 }
				const ayaseObj: FishObj = { asset: "irasutoya_kousya", name: "スクーリング", point: -100 }
				const koreanObj: FishObj = { asset: "korean", name: "韓国", point: 200 }
				const launchObj: FishObj = { asset: "launch", name: "昼食", point: 200 }
				const katsudonObj: FishObj = { asset: "taoru", name: "カツドン", point: 200 }
				// 令和2020年
				const reiwa: FishObj = { text: "令和2020年", name: "令和2020年", point: 2020, speed: -30 }

				/** @param fishTemplate 流す魚の種類。 */
				const fishObjList: FishObj[] = [karaokeObj, tuusinboObj, inuObj, dtObj, ayaseObj, koreanObj, launchObj, katsudonObj]

				// 定期実行。setIntervalもAkashicEngineで用意されてる方を使う。これもニコ生のTSを考慮しているらしい。
				scene.setInterval(() => {
					// ランダムで魚を生成する。
					scene.setTimeout(() => {
						const fishObj = fishObjList[random(0, fishObjList.length)]
						createFish(fishObj)
					}, random(100, 500))

					// 残り40秒で増やす
					if (time <= 40) {
						// ランダムで魚を生成する。
						scene.setTimeout(() => {
							const fishObj = fishObjList[random(0, fishObjList.length)]
							createFish(fishObj)
						}, random(100, 500))
					}

				}, 500)

				// 残り20秒で令和2020出す？
				scene.setTimeout(() => {
					// 流す魚の種類の配列に追加
					fishObjList.push(reiwa)
				}, 1000 * (time - 20)) // 制限時間から20引けば

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
					timeLabel.text = "残り時間: " + Math.ceil(time)
					timeLabel.invalidate()
				}
				scene.update.add(updateHandler)
				// ここまでゲーム内容を記述します
			})
			g.game.pushScene(scene)

		}, 5000)
	})
	g.game.pushScene(titleScene)
}

const createWave = (scene: g.Scene) => {
	// 画像を切り替えて波っぽく
	let waveType = 0
	let wave: g.Sprite
	setInterval(() => {
		let waveSrc = "nami"
		switch (waveType) {
			case 0:
				waveSrc = "nami"
				break
			case 1:
				waveSrc = "nami_2"
				break
			case 2:
				waveSrc = "nami_3"
				break
		}
		if (typeof wave !== "undefined") {
			scene.remove(wave)
		}
		wave = new g.Sprite({
			scene: scene,
			src: scene.assets[waveSrc],
			y: 100
		})
		scene.append(wave)
		waveType++
		if (waveType > 3) {
			waveType = 0
		}
	}, 1000 * 2)
}
