import { Meteor } from 'meteor/meteor'
import { Random } from 'meteor/random'
import { check } from 'meteor/check'
import * as _ from 'underscore'
import {
	IMOSConnectionStatus,
	IMOSDevice,
	IMOSListMachInfo,
	MosString128,
	MosTime,
	IMOSRunningOrder,
	IMOSRunningOrderBase,
	IMOSRunningOrderStatus,
	IMOSStoryStatus,
	IMOSItemStatus,
	IMOSStoryAction,
	IMOSROStory,
	IMOSROAction,
	IMOSItemAction,
	IMOSItem,
	IMOSROReadyToAir,
	IMOSROFullStory,
	IMOSStory,
	IMOSObjectPathType,
	IMOSObjectPath,
	MosDuration,
	IMOSObjectStatus,
	IMOSObjectAirStatus,
	IMOSObject,
	IMOSObjectType
} from 'mos-connection'

import { PeripheralDeviceAPI } from '../../lib/api/peripheralDevice'
import { PeripheralDevices, PeripheralDevice, PlayoutDeviceType } from '../../lib/collections/PeripheralDevices'
import { getCurrentTime, saveIntoDb, literal, DBObj, partialExceptId } from '../../lib/lib'
import { PeripheralDeviceSecurity } from '../security/peripheralDevices'

import { RunningOrder, RunningOrders } from '../../lib/collections/RunningOrders'
import { SegmentLine, SegmentLines } from '../../lib/collections/SegmentLines'
import { SegmentLineItem, SegmentLineItems } from '../../lib/collections/SegmentLineItems'
import { Segment, Segments } from '../../lib/collections/Segments'
import { ServerPeripheralDeviceAPI } from '../api/peripheralDevice'
import { logger } from './../logging'

// These are temporary methods, used during development to put some data into the database
function getPD (): PeripheralDevice {
	return PeripheralDevices.findOne({
		type: PeripheralDeviceAPI.DeviceType.MOSDEVICE
	}) as PeripheralDevice
}
Meteor.methods({
	'debug_roCreate' () {
		let pd = getPD()
		Meteor.call(PeripheralDeviceAPI.methods.mosRoCreate, pd._id, pd.token, xmlApiData.roCreate)
	},
	'debug_roReplace' () {
		let pd = getPD()
		Meteor.call(PeripheralDeviceAPI.methods.mosRoReplace, pd._id, pd.token, xmlApiData.roReplace)
	},
	'debug_roDelete' () {
		let pd = getPD()
		Meteor.call(PeripheralDeviceAPI.methods.mosRoDelete, pd._id, pd.token, new MosString128('' + xmlApiData.roDelete))
	},
	'debug_roMock0_remove' () {
		let pd = getPD()
		Meteor.call(PeripheralDeviceAPI.methods.mosRoDelete, pd._id, pd.token,
			new MosString128('MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71'))
	},
	'debug_fakeMosDevice' () {
		Meteor.call(PeripheralDeviceAPI.methods.initialize, 'myMockMosDevice', 'token0' , {
			type: PeripheralDeviceAPI.DeviceType.MOSDEVICE,
			name: 'My mockDevice',
			connectionId: '1234'
		})
		PeripheralDevices.update('myMockMosDevice', {$set: {
			studioInstallationId: 'studio0'
		}})
		
	},
	'debug_roMock0' () {
		let pd = getPD()
		if (!pd) {
			throw new Meteor.Error(404, 'MOS Device not found to be used for mock running order!')
		}
		let id = pd._id
		let token = pd.token
		logger.info('debug_roMock0')
		// @ts-ignore
		Meteor.call(PeripheralDeviceAPI.methods.mosRoCreate, id, token,
			{"ID":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Slug":"DKTE TV 1850 ONSDAG","EditorialStart":"2018-05-02T14:50:00,000","EditorialDuration":"0:15:00","MosExternalMetaData":[{"MosSchema":"http://MAENPSTEST14:10505/schema/enpsro.dtd","MosPayload":{"AllowExternalMod":1,"EndTime":"2018-05-02T16:59:00","MOSRedirection":"chyron=chyron.techycami02.ndte.nrk.mos","MOSROStatus":"PLAY","MOSROStatusMOS":"MOSART2.NDTE.MOS","MOSROStatusTime":"2018-05-02T16:50:00","MOSroStorySend":"SOFIE2.XPRO.MOS","ProgramName":"DKTE TV 2055","RundownDuration":"00:09:00","StartTime":"2018-05-02T16:50:00","AnsvRed":"DKTE","Clipnames":"Klipp 1;DKTE99050218AA\\Klipp 2;DKTE99050218AU\\Klipp 3;\\Klipp 4;","Kanal":"NRK1","ProdEnh":"DKTE","ProdNr":"DKTE99050218","Regionalsend":"TE/VE/BU","ROSubType":"Broadcast","LocalStartTime":"2018-05-02T18:50:00+02:00","ENPSItemType":2,"roLayout":"PageNum_600|RowStatus_150|Slug_1200|SegStatus_210|Segment_920|Break_600|Presenter_1000|Approved_600|Estimated_840|Actual_720|FrontTime_1000|BackTime_1000|CumeTime_1000|ModBy_1200|Tekniske-opplysninger_2195"},"MosScope":"PLAYLIST"}],"Stories":[{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;1E3CAE45-F5D8-4378-AA627DF2C6089897","Slug":"NRK Østafjells;020518-1850","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;9141DBA1-93DD-4B19-BEBB32E0D6222E1B","Slug":"Åpning;vignett","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;6364CE48-9B6A-4D36-B7F8352E6E11EDB7","Slug":"Åpning;head-hundepose-020518","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;4CBE86C0-9A69-4EF4-81F8E8CD275092E8","Slug":"Åpning;head-mesterskap-020518-te","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;8B0D9EE2-EF9A-472F-80C6DD2CCDCFC2E6","Slug":"Åpning;velkommen","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;BD68FC84-9654-4E3E-B799104C28B28CAB","Slug":"DROPP BÆSJEPOSE;inn","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;FBB8E962-3DB5-4C92-AD7CA00B33710D1C","Slug":"DROPP BÆSJEPOSE;HUNDEPOSE-020518-te","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;637F3BE2-8154-4E00-ABEBE2C0AED642E8","Slug":"INNSAMLING;tekst","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;79588F90-8422-4FB7-8EC199E3CB93BEA4","Slug":"INNSAMLING;LARVIK-KONKURS","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;E60ED2B4-1BC1-4327-98E4DC0070B42795","Slug":"INNSAMLING;gjest","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;52915640-EDC4-4CF3-92D0F9D41FC26A6E","Slug":"FYLKESMESTERSKAP;inn","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;E13788E2-5F04-4014-A6F8001F35CFFBB4","Slug":"FYLKESMESTERSKAP;MESTERSKAP-020518-TE","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;D215CE3F-0094-4D94-89F9B317ADB1387B","Slug":"Anmeldelse Hassel fengsel;tekst","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;5BF7D6CA-2CF6-479B-B87B02595CAFE170","Slug":"Anmeldelse Hassel fengsel;HASSEL-020518S-TE","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;9E41486F-9E9A-421E-9EE410EE88DEF972","Slug":"Anmeldelse Hassel fengsel;HASSEL-020518-TE","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;A0A2BBD6-82EA-4418-A594524FE53C4E40","Slug":"VÆRET;tekst","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;DE1D32B4-8F10-4769-ACCC558EB9A44167","Slug":"VÆRET;VÆRPLAKAT-KYST","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;1CFBCFBF-4713-461E-97AE2A3354FFBB2C","Slug":"VÆRET;VÆRPLAKAT-FJELLET","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;A3D511ED-8C88-46AF-9CB9BA67630A5591","Slug":"KOMMER 2055;tekst","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;5C9D3E10-35DC-4DC5-84A799BA882F7389","Slug":"KOMMER 2055;HEAD-TOG","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;D7850305-1C4D-4D14-91FCE6327C3C0825","Slug":"TAKK FOR I KVELD;Takk for i kveld","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;0C1BCAED-D3C2-4671-B8E96F79860C6308","Slug":"TAKK FOR I KVELD;SLUTTPLAKAT start 18:58:50","Items":[]},{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;EF1A29D9-EF4C-4965-893A4910B2212E66","Slug":"AVSLUTT;Slutt 18.59.00","Items":[]}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:29.262Z"}
		)
		Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
			{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;1E3CAE45-F5D8-4378-AA627DF2C6089897","Slug":"NRK Østafjells;020518-1850","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":0,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N639194","ModTime":"20180514T144034Z","MOSAbstracts":"_00:00:03:00 | @M=Auto Openend | 201 loop | 1: | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations":0,"MOSObjSlugs":"201 loop 1:  2:","MOSSlugs":"NRK ØSTAFJELLS;ddmm15-1845-3","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"<BAK KLARHD<00:01>>","TextTime":0,"SystemApprovedBy":"N12914","mosartType":"BREAK","ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"chyron.mprochycami02.npro.nrk.mos","mosAbstract":"_00:00:03:00 | @M=Auto Openend | 201 loop | 1: | 2: | 3: | 4: | 00:00:00:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010001_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG2","itemSlug":"NRK ØSTAFJELLS;ddmm15-1845-3","mosObj":{"objID":"NYHETER\\00010001?version=1","objSlug":"201 loop 1:  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010001_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08","mosPayload":{"sAVsom":"00:00:03:00","sAVeom":"00:00:00:00","createdBy":"N18685","subtype":"lyric/data","subtypeid":"I:\\CAMIO\\NYHETER\\Templates\\Bakskjerm\\00000201.lyr","ObjectDetails":{"ServerID":"chyron.mprochycami02.npro.nrk.mos","ServerURL":"http://160.68.33.159/CAMIO/Redirection/MOSRedirection.asmx"}}}},"itemID":5}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:29.460Z"}
		)
		Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
			{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;9141DBA1-93DD-4B19-BEBB32E0D6222E1B","Slug":"Åpning;vignett","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Actual":4,"Approved":1,"Creator":"LINUXENPS","ElapsedTime":3,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T144559Z","MOSAbstracts":"M: NRK Østafjells (20-04-16 09:07)\nTIDSMARKØR IKKE RØR","MOSItemDurations":"","MOSItemEdDurations":"","MOSObjSlugs":"M: NRK Østafjells\nStory status","MOSSlugs":"VIGNETT;vignett-5\nVIGNETT;vignett-3","MOSTimes":"20180502T165008720Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"<LYS Q1>","StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Kilde":"TV","mosartType":"FULL","mosartVariant":"VIGNETT2018","ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":9,"objID":"N11580_1461136025","mosID":"METADATA.NRK.MOS","mosAbstract":"M: NRK Østafjells (20-04-16 09:07)","objSlug":"M: NRK Østafjells","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"type":"video","changedBy":"N11580","changetime":"2016-04-20T09:07:05 +02:00","mdSource":"ncs","title":"NRK Østafjells","description":{},"hbbtv":{"link":""},"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"VIGNETT;vignett-5"}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":10,"itemSlug":"VIGNETT;vignett-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:29.665Z"}
		)
		Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
			{
				"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;6364CE48-9B6A-4D36-B7F8352E6E11EDB7",
				"Slug":"Åpning;head-hundepose-020518",
				"MosExternalMetaData":[
				   {
					  "MosScope":"PLAYLIST",
					  "MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd",
					  "MosPayload":{
						 "Approved":0,
						 "Break":0,
						 "Creator":"LINUXENPS",
						 "ElapsedTime":5,
						 "Estimated":10,
						 "MediaTime":0,
						 "ModBy":"N639194",
						 "ModTime":"20180514T143249Z",
						 "MOSAbstracts":"head-hundepose-020518-te NYHETER 00:00:11:19 \nPhiltest27\n_00:00:00:00 | @M=Auto Openend | 52 headline | 1:Vil ikkje ha poser til hundebæsj | 2:Østafjells | 3: | 4: | 00:00:07:00\nTIDSMARKØR IKKE RØR",
						 "MOSItemDurations":"11,76\n11,76\n0",
						 "MOSItemEdDurations":"",
						 "MOSObjSlugs":"head-hundepose-020518-te\nPhiltest27\n52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells\nStory status",
						 "MOSSlugs":"HEAD;head-Bæsjepose-4\nPhiltest27\n52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells\nSAK VESTFOLD;head-3",
						 "MOSTimes":"20180502T165013906Z",
						 "Owner":"LINUXENPS",
						 "Printed":"20180502T164204Z",
						 "SourceMediaTime":0,
						 "SourceTextTime":0,
						 "StoryLogPreview":"Miljøpartiet vil droppe posen til hundebæsjen - slik vil dei spare miljøet. \nOne Two",
						 "StoryProducer":"DKTE",
						 "TextTime":6,
						 "SystemApprovedBy":"N12914",
						 "Kilde":"TV",
						 "mosartType":"STK",
						 "mosartVariant":"HEAD",
						 "OpprLand":"Norge",
						 "ReadTime":6,
						 "Rettigheter":"Grønt",
						 "Team":"(Kun for STK:) Foto: / Redigering:",
						 "ENPSItemType":3
					  }
				   }
				],
				"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71",
				"Body":[
				   {
					  "Type":"storyItem",
					  "Content":{
						 "itemID":13,
						 "itemSlug":"HEAD;head-Bæsjepose-4",
						 "objID":"\\\\XPRO\\Omn\\C\\S\\25\\07",
						 "mosID":"OMNIBUS.XPRO.MOS",
						 "mosAbstract":"head-hundepose-020518-te NYHETER 00:00:11:19",
						 "objDur":588,
						 "objTB":50,
						 "objSlug":"head-hundepose-020518-te",
						 "mosExternalMetadata":{
							"mosScope":"PLAYLIST",
							"mosSchema":"OMNIBUS",
							"mosPayload":{
							   "title":"head-hundepose-020518-te",
							   "objectType":"CLIP",
							   "clipType":"NYHETER",
							   "objDur":588,
							   "objType":"VIDEO"
							}
						 }
					  }
				   },
				   {
					  "Type":"storyItem",
					  "Content":{
						 "itemID":10,
						 "itemSlug":"Philtest27",
						 "objID":"Philtest27",
						 "mosID":"OMNIBUS.XPRO.MOS",
						 "mosAbstract":"Philtest27",
						 "objDur":588,
						 "objTB":50,
						 "objSlug":"Philtest27",
						 "mosExternalMetadata":{
							"mosScope":"PLAYLIST",
							"mosSchema":"http://mos.ap.org/blah.htm",
							"mosPayload":{
							   "title":"head-hundepose-020518-te",
							   "objectTypex":"CLIP",
							   "clipTypex":"NYHETER",
							   "objDurx":588,
							   "objTypex":"VIDEO"
							}
						 }
					  }
				   },
				   {
					  "Type":"storyItem",
					  "Content":{
						 "mosID":"chyron.techycami02.XPRO.nrk.mos",
						 "abstract":"_00:00:00:00 | @M=Auto Openend | 52 headline | 1:Vil ikkje ha poser til hundebæsj | 2:Østafjells | 3: | 4: | 00:00:07:00",
						 "objPaths":{
							"objProxyPath":{
							   "techDescription":"JPEG Thumbnail",
							   "$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058473_v1_big.jpg"
							},
							"objMetadataPath":{
			 
							}
						 },
						 "itemChannel":"CG1",
						 "itemSlug":"52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells",
						 "mosObj":{
							"objID":"NYHETER\\00058473?version=1",
							"objSlug":"52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells",
							"mosItemEditorProgID":"Chymox.AssetBrowser.1",
							"objDur":0,
							"objTB":0,
							"objPaths":{
							   "objProxyPath":{
								  "techDescription":"JPEG Thumbnail",
								  "$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058473_v1_big.jpg"
							   },
							   "objMetadataPath":{
			 
							   }
							},
							"mosExternalMetadata":{
							   "mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"
							}
						 },
						 "itemID":14
					  }
				   },
				   {
					  "Type":"storyItem",
					  "Content":{
						 "mosID":"mosart.morten.mos",
						 "abstract":"TIDSMARKØR IKKE RØR",
						 "objID":"STORYSTATUS",
						 "objSlug":"Story status",
						 "itemID":3,
						 "itemSlug":"SAK VESTFOLD;head-3"
					  }
				   }
				],
				"level":"debug",
				"message":"",
				"timestamp":"2018-05-15T06:51:29.876Z"
			 }		)
		Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
			{
				"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;4CBE86C0-9A69-4EF4-81F8E8CD275092E8",
				"Slug":"Åpning;head-mesterskap-020518-te",
				"MosExternalMetaData":[
				   {
					  "MosScope":"PLAYLIST",
					  "MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd",
					  "MosPayload":{
						 "Approved":0,
						 "Creator":"LINUXENPS",
						 "ElapsedTime":7,
						 "MediaTime":0,
						 "ModBy":"N639194",
						 "ModTime":"20180515T063647Z",
						 "MOSAbstracts":"head-mesterskap-020518-te NYHETER 00:00:12:13 \n_00:00:00:00 | @M=Auto Openend | 52 headline | 1:Fylkesmeisterskap i Vestfold | 2:Østafjells | 3: | 4: | 00:00:07:00\nTIDSMARKØR IKKE RØR",
						 "MOSItemDurations":"12,52\n0",
						 "MOSItemEdDurations":"",
						 "MOSObjSlugs":"head-mesterskap-020518-te\n52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells\nStory status",
						 "MOSSlugs":"FYLKESMESTERSKAP;head-mesterskap-020518-te-4\n52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells\nSAK VESTFOLD;head-3",
						 "MOSTimes":"20180502T165021004Z",
						 "Owner":"LINUXENPS",
						 "Printed":"20180502T164204Z",
						 "SourceMediaTime":0,
						 "SourceTextTime":0,
						 "StoryLogPreview":"Lærlingar konkurrerte i barne- og ungdomsarbeiderfaget. Arrangementet skal skape blest rundt yrket.",
						 "StoryProducer":"DKTE",
						 "TextTime":7,
						 "SystemApprovedBy":"N12914",
						 "Kilde":"TV",
						 "mosartType":"STK",
						 "mosartVariant":"HEAD",
						 "OpprLand":"Norge",
						 "ReadTime":7,
						 "Rettigheter":"Grønt",
						 "Team":"(Kun for STK:) Foto: / Redigering:",
						 "ENPSItemType":3
					  }
				   }
				],
				"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71",
				"Body":[
				   {
					  "Type":"storyItem",
					  "Content":{
						 "itemID":9,
						 "itemSlug":"FYLKESMESTERSKAP;head-mesterskap-020518-te-4",
						 "objID":"\\\\xpro\\Omn\\C\\S\\24\\61",
						 "mosID":"OMNIBUS.XPRO.MOS",
						 "mosAbstract":"head-mesterskap-020518-te NYHETER 00:00:12:13",
						 "objDur":626,
						 "objTB":50,
						 "objSlug":"head-mesterskap-020518-te",
						 "mosExternalMetadata":{
							"mosScope":"PLAYLIST",
							"mosSchema":"OMNIBUS",
							"mosPayload":{
							   "title":"head-mesterskap-020518-te",
							   "objectType":"CLIP",
							   "clipType":"NYHETER",
							   "objDur":626,
							   "objType":"VIDEO"
							}
						 }
					  }
				   },
				   {
					  "Type":"storyItem",
					  "Content":{
						 "itemID":8,
						 "itemSlug":"52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells",
						 "itemChannel":"CG1",
						 "mosID":"chyron.techycami02.xpro.nrk.mos",
						 "abstract":"_00:00:00:00 | @M=Auto Openend | 52 headline | 1:Fylkesmeisterskap i Vestfold | 2:Østafjells | 3: | 4: | 00:00:07:00",
						 "mosObj":{
							"objID":"NYHETER\\00058435?version=1",
							"objSlug":"52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells",
							"mosItemEditorProgID":"Chymox.AssetBrowser.1",
							"objDur":0,
							"objTB":0,
							"objPaths":{
							   "objProxyPath":{
								  "techDescription":"JPEG Thumbnail",
								  "$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058435_v1_big.jpg"
							   },
							   "objMetadataPath":{
			 
							   }
							},
							"mosExternalMetadata":{
							   "mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"
							}
						 }
					  }
				   },
				   {
					  "Type":"storyItem",
					  "Content":{
						 "mosID":"mosart.morten.mos",
						 "abstract":"TIDSMARKØR IKKE RØR",
						 "objID":"STORYSTATUS",
						 "objSlug":"Story status",
						 "itemID":3,
						 "itemSlug":"SAK VESTFOLD;head-3"
					  }
				   }
				],
				"level":"debug",
				"message":"",
				"timestamp":"2018-05-15T06:51:30.074Z"
			 }		)
		Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, // @todo gfx?
			{
				"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;8B0D9EE2-EF9A-472F-80C6DD2CCDCFC2E6",
				"Slug":"Åpning;velkommen",
				"MosExternalMetaData":[
				   {
					  "MosScope":"PLAYLIST",
					  "MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd",
					  "MosPayload":{
						 "Approved":0,
						 "Creator":"LINUXENPS",
						 "ElapsedTime":5,
						 "Estimated":0,
						 "MediaTime":0,
						 "ModBy":"N639194",
						 "ModTime":"20180514T135619Z",
						 "MOSAbstracts":"_00:00:00:00 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00\nTIDSMARKØR IKKE RØR",
						 "MOSItemDurations":0,
						 "MOSItemEdDurations":"",
						 "MOSObjSlugs":"50 logo 1:  2:\nStory status",
						 "MOSSlugs":"50 logo 1:  2:\nVelkommen;velkommen-4",
						 "MOSTimes":"20180502T165026622Z",
						 "Owner":"LINUXENPS",
						 "SourceMediaTime":0,
						 "SourceTextTime":0,
						 "StoryLogPreview":"<BAK FADE<00:01:12>>",
						 "TextTime":0,
						 "SystemApprovedBy":"N12914",
						 "mosartType":"KAM",
						 "mosartVariant":"ÅPNING3",
						 "ReadTime":0,
						 "ENPSItemType":3
					  }
				   }
				],
				"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71",
				"Body":[
				   {
					  "Type":"storyItem",
					  "Content":{
						 "mosID":"chyron.techycami02.xpro.nrk.mos",
						 "abstract":"_00:00:00:00 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00",
						 "objPaths":{
							"objProxyPath":{
							   "techDescription":"JPEG Thumbnail",
							   "$t":"http://160.68.33.159/thumbs/NYHETER/16000/Objects_NYHETER_00016967_v1_big.jpg"
							},
							"objMetadataPath":{
			 
							}
						 },
						 "itemChannel":"CG1",
						 "itemSlug":"50 logo 1:  2:",
						 "mosObj":{
							"objID":"NYHETER\\00016967?version=1",
							"objSlug":"50 logo 1:  2:",
							"mosItemEditorProgID":"Chymox.AssetBrowser.1",
							"objDur":0,
							"objTB":0,
							"objPaths":{
							   "objProxyPath":{
								  "techDescription":"JPEG Thumbnail",
								  "$t":"http://160.68.33.159/thumbs/NYHETER/16000/Objects_NYHETER_00016967_v1_big.jpg"
							   },
							   "objMetadataPath":{
			 
							   }
							},
							"mosExternalMetadata":{
							   "mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"
							}
						 },
						 "itemID":6
					  }
				   },
				   {
					  "Type":"storyItem",
					  "Content":{
						 "mosID":"mosart.morten.mos",
						 "abstract":"TIDSMARKØR IKKE RØR",
						 "objID":"STORYSTATUS",
						 "objSlug":"Story status",
						 "itemID":5,
						 "itemSlug":"Velkommen;velkommen-4"
					  }
				   }
				],
				"level":"debug",
				"message":"",
				"timestamp":"2018-05-15T06:51:30.275Z"
			 }		)
		Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, // @todo gfx
			{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;BD68FC84-9654-4E3E-B799104C28B28CAB","Slug":"DROPP BÆSJEPOSE;inn","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":0,"Creator":"LINUXENPS","ElapsedTime":8,"MediaTime":0,"ModBy":"N639194","ModTime":"20180514T135819Z","MOSAbstracts":"_00:00:00:00 | @M=Auto Storyend | 202 bilde | 1:0205-hundebæsj | 2: | 3: | 4: | 00:00:00:00\n_00:00:02:00 | @M=Auto Timed | 01 ett navn | 1:Martin Torstveit | 2:2.mai 2018 | 3: | 4: | 00:00:05:00\nTIDSMARKØR IKKE RØR","MOSItemDurations":"0\n0","MOSItemEdDurations":"","MOSObjSlugs":"202 bilde 1:0205-hundebæsj  2:\n01 ett navn 1:Martin Torstveit  2:2.mai 2018\nStory status","MOSSlugs":"202 bilde 1:0205-hundebæsj  2:\n01 ett navn 1:Martin Torstveit  2:2.mai 2018\nSAK 1;intro-3","MOSTimes":"20180502T165034836Z","Owner":"LINUXENPS","Printed":"20180502T164204Z","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"(K3) God kveld og velkommen. Folk bør la hundebæsjen bli liggande når dei er ute og lufter bikkja. Det meiner Miljøpartiet De Grønne. Partiet meiner det kan redusere mengden poser me kaster i søpla.","TextTime":13,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":3,"ReadTime":13,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":5,"itemSlug":"202 bilde 1:0205-hundebæsj  2:","itemChannel":"CG2","mosID":"chyron.techycami02.xpro.nrk.mos","abstract":"_00:00:00:00 | @M=Auto Storyend | 202 bilde | 1:0205-hundebæsj | 2: | 3: | 4: | 00:00:00:00","mosObj":{"objID":"NYHETER\\00058461?version=1","objSlug":"202 bilde 1:0205-hundebæsj  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058461_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.xpro.nrk.mos","abstract":"_00:00:02:00 | @M=Auto Timed | 01 ett navn | 1:Martin Torstveit | 2:2.mai 2018 | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058439_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Martin Torstveit  2:2.mai 2018","mosObj":{"objID":"NYHETER\\00058439?version=1","objSlug":"01 ett navn 1:Martin Torstveit  2:2.mai 2018","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058439_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":8}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:30.478Z"}
		)
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;FBB8E962-3DB5-4C92-AD7CA00B33710D1C","Slug":"DROPP BÆSJEPOSE;HUNDEPOSE-020518-te","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":0,"Creator":"LINUXENPS","ElapsedTime":114,"Estimated":114,"MediaTime":114.52,"ModBy":"N639194","ModTime":"20180514T140141Z","MOSAbstracts":"METADATA\n HUNDEPOSE-020518-TE NYHETER 00:01:54:13 \n_00:00:02:00 | @M=Manual Timed | 01 ett navn | 1:Maria Kommandantvold | 2:reporter | 3: | 4: | 00:00:05:00\n_00:00:24:11 | @M=Auto Timed | 01 ett navn | 1:Christina Albrecht Olsen | 2:Sankt Hansberget barnehage | 3: | 4: | 00:00:04:00\n_00:00:45:00 | @M=Auto Timed | 01 ett navn | 1:Hanne Lisa Matt | 2:Miljøpartiet De Grønne | 3: | 4: | 00:00:05:00\n_00:01:06:00 | @M=Auto Timed | 01 ett navn | 1:Louise Abel Morberg | 2:hundeeier | 3: | 4: | 00:00:05:00\n_00:01:47:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Tordis Gauteplass | 3: | 4: | 00:00:04:00\nTIDSMARKØR IKKE RØR","MOSItemDurations":"114,52\n0\n0\n0\n0\n0","MOSItemEdDurations":"","MOSObjSlugs":"M: \nHUNDEPOSE-020518-TE\n01 ett navn 1:Maria Kommandantvold  2:reporter\n01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage\n01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne\n01 ett navn 1:Louise Abel Morberg  2:hundeeier\n24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass\nStory status","MOSSlugs":"SAK BUSKERUD;SAK-14\nDROPP BÆSJEPOSE;HUNDEPOSE-020518-te-12\n01 ett navn 1:Maria Kommandantvold  2:reporter\n01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage\n01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne\n01ett navn 1:Louise Abel Morberg  2:hundeeier\n24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass\nSAK BUSKERUD;SAK-20","MOSTimes":"20180515T064107Z\n\n\n\n\n\n20180502T165229810Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"","StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Kilde":"TV","mosartTransition":"","mosartType":"FULL","ReadTime":114.52,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":2,"objID":"N11580_1412594672","mosID":"METADATA.NRK.MOS","mosAbstract":"METADATA","objSlug":"M:","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"type":"video","changedBy":"N11580","changetime":"2014-10-06T13:24:32 +02:00","title":{},"description":{},"hbbtv":{"link":""},"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"SAK BUSKERUD;SAK-14"}},{"Type":"storyItem","Content":{"itemID":15,"itemSlug":"DROPP BÆSJEPOSE;HUNDEPOSE-020518-te-12","objID":"\\\\xpro\\Omn\\C\\S\\24\\70","mosID":"OMNIBUS.xpro.MOS","abstract":"HUNDEPOSE-020518-TE NYHETER 00:01:54:13","objDur":5726,"objTB":50,"objSlug":"HUNDEPOSE-020518-TE","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.xpro.nrk.mos","abstract":"_00:00:02:00 | @M=Manual Timed | 01 ett navn | 1:Maria Kommandantvold | 2:reporter | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058457_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Maria Kommandantvold  2:reporter","mosObj":{"objID":"NYHETER\\00058457?version=1","objSlug":"01 ett navn 1:Maria Kommandantvold  2:reporter","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058457_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":16}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.xpro.nrk.mos","abstract":"_00:00:24:11 | @M=Auto Timed | 01 ett navn | 1:Christina Albrecht Olsen | 2:Sankt Hansberget barnehage | 3: | 4: | 00:00:04:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058464_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage","mosObj":{"objID":"NYHETER\\00058464?version=1","objSlug":"01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058464_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":17}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.xpro.nrk.mos","abstract":"_00:00:45:00 | @M=Auto Timed | 01 ett navn | 1:Hanne Lisa Matt | 2:Miljøpartiet De Grønne | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058458_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne","mosObj":{"objID":"NYHETER\\00058458?version=1","objSlug":"01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058458_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":18}},{"Type":"storyItem","Content":{"itemID":19,"itemSlug":"01 ett navn 1:Louise Abel Morberg  2:hundeeier","itemChannel":"CG1","mosID":"chyron.techycami02.xpro.nrk.mos","abstract":"_00:01:06:00 | @M=Auto Timed | 01 ett navn | 1:Louise Abel Morberg | 2:hundeeier | 3: | 4: | 00:00:05:00","mosObj":{"objID":"NYHETER\\00058478?version=1","objSlug":"01 ett navn 1:Louise Abel Morberg  2:hundeeier","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058478_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.xpro.nrk.mos","abstract":"_00:01:47:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Tordis Gauteplass | 3: | 4: | 00:00:04:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058463_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass","mosObj":{"objID":"NYHETER\\00058463?version=1","objSlug":"24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058463_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":21}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":8,"itemSlug":"SAK BUSKERUD;SAK-20"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:30.708Z"}
		// )
		Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, // @todo gfx
			{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;637F3BE2-8154-4E00-ABEBE2C0AED642E8","Slug":"INNSAMLING;tekst","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","ElapsedTime":17,"Estimated":20,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T164244Z","MOSAbstracts":"TIDSMARKØR IKKE RØR","MOSObjSlugs":"Story status","MOSSlugs":"SAK 1;intro-3","MOSTimes":"20180502T165235816Z","Owner":"LINUXENPS","Printed":"20180502T164204Z","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"(K2) Larvik håndballklubb har fått inn omkring 2,5 millioner kroner i gåvepengar, (***) som skal redde klubben frå konkurs.\nKlubben manglar likevel omlag 500.000 kroner for å nå målet på tre millionar kroner.","TextTime":18,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":2,"ReadTime":18,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:30.883Z"}
		)
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;79588F90-8422-4FB7-8EC199E3CB93BEA4","Slug":"INNSAMLING;LARVIK-KONKURS","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T150756Z","MOSAbstracts":"METADATA\n LARVIK-KONKURS-020518S-TE NYHETER 00:00:30:01 \n_00:00:00:00 | @M=Auto Timed | 10 info | 1:Larvik treng pengar | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations":"30,04\n0","MOSItemEdDurations":"","MOSObjSlugs":"M: \nLARVIK-KONKURS-020518S-TE\n10 info 1:Larvik treng pengar  2:","MOSSlugs":"STK 1;STK-5\nINNSAMLING;STK-2\n10 info 1:Larvik treng pengar  2:","MOSTimes":"","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Kilde":"TV","mosartType":"STK","OpprLand":"Norge","ReadTime":0,"Rettigheter":"Grønt","Team":"(Kun for STK:) Foto: / Redigering:","ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":4,"objID":"N11580_1412594672","mosID":"METADATA.NRK.MOS","mosAbstract":"METADATA","objSlug":"M:","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"type":"video","changedBy":"N11580","changetime":"2014-10-06T13:24:32 +02:00","title":{},"description":{},"hbbtv":{"link":""},"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"STK 1;STK-5"}},{"Type":"storyItem","Content":{"itemID":2,"itemSlug":"INNSAMLING;STK-2","objID":"\\\\NDTE\\Omn\\C\\S\\24\\64","mosID":"OMNIBUS.NDTE.MOS","abstract":"LARVIK-KONKURS-020518S-TE NYHETER 00:00:30:01","objDur":1502,"objTB":50,"objSlug":"LARVIK-KONKURS-020518S-TE","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:00:00 | @M=Auto Timed | 10 info | 1:Larvik treng pengar | 2: | 3: | 4: | 00:00:00:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058452_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"10 info 1:Larvik treng pengar  2:","mosObj":{"objID":"NYHETER\\00058452?version=1","objSlug":"10 info 1:Larvik treng pengar  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058452_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":5}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:31.085Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;E60ED2B4-1BC1-4327-98E4DC0070B42795","Slug":"INNSAMLING;gjest","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Actual":120,"Approved":1,"Creator":"LINUXENPS","ElapsedTime":109,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T143332Z","MOSAbstracts":"_00:02:00:00 | @M=Manual Timed | 01 ett navn | 1:Cathrine Svendsen | 2:styreleder, LHK | 3: | 4: | 00:00:00:00\nTIDSMARKØR IKKE RØR","MOSItemDurations":0,"MOSItemEdDurations":"","MOSObjSlugs":"01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK\nStory status","MOSSlugs":"01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK\nSAK 1;intro-3","MOSTimes":"20180502T165437473Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"TextTime":0,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":3,"ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":{},"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058436_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK","mosObj":{"objID":"NYHETER\\00058436?version=1","objSlug":"01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058436_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":3}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:31.288Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;52915640-EDC4-4CF3-92D0F9D41FC26A6E","Slug":"FYLKESMESTERSKAP;inn","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","ElapsedTime":15,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T163813Z","MOSAbstracts":"TIDSMARKØR IKKE RØR","MOSObjSlugs":"Story status","MOSSlugs":"SAK 1;intro-3","MOSTimes":"20180502T165453205Z","Owner":"LINUXENPS","Printed":"20180502T164204Z","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"(K2) I dag blei det arrangert fylkesmesterskap i barne- og ungdomsarbeiderfaget i Re kommune i Vestfold. \nGjennom forskjellige konkurransar fekk lærlingar vist fram sine ferdigheter.","TextTime":18,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":2,"ReadTime":18,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:31.495Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;E13788E2-5F04-4014-A6F8001F35CFFBB4","Slug":"FYLKESMESTERSKAP;MESTERSKAP-020518-TE","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","ElapsedTime":96,"Estimated":110,"MediaTime":96.24,"ModBy":"N12914","ModTime":"20180502T144537Z","MOSAbstracts":"M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget (02-05-18 15:10)\n MESTERSKAP-020518-TE NYHETER 00:01:36:06 \n_00:00:07:00 | @M=Auto Timed | 01 ett navn | 1:Anne Melsom Bjerke | 2:reporter | 3: | 4: | 00:00:05:00\n_00:00:19:00 | @M=Auto Timed | 01 ett navn | 1:Marius | 2: | 3: | 4: | 00:00:05:00\n_00:00:46:00 | @M=Auto Timed | 01 ett navn | 1:Hilde Abrahamsen | 2:Fagforbundet i Vestfold  | 3: | 4: | 00:00:05:00\n_00:01:11:00 | @M=Auto Timed | 01 ett navn | 1:Sandra Blegeberg Sørsdahl | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00\n_00:01:21:00 | @M=Auto Timed | 01 ett navn | 1:Juliane Svalestad | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00\n_00:01:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Henrik Bøe | 3: | 4: | 00:00:05:00\nTIDSMARKØR IKKE RØR","MOSItemDurations":"96,24\n0\n0\n0\n0\n0\n0","MOSItemEdDurations":"","MOSObjSlugs":"M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget\nMESTERSKAP-020518-TE\n01 ett navn 1:Anne Melsom Bjerke  2:reporter\n01 ett navn 1:Marius  2:\n01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold \n01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider\n01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider\n24 foto/red 1:Foto og redigering:  2:Henrik Bøe\nStory status","MOSSlugs":"SAK BUSKERUD;SAK-14\nFYLKESMESTERSKAP;MESTERSKAP-020518-TE-13\n01 ett navn 1:Anne Melsom Bjerke  2:reporter\n01 ett navn 1:Marius  2:\n01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold \n01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider\n01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider\n24 foto/red 1:Foto og redigering:  2:Henrik Bøe\nSAK BUSKERUD;SAK-20","MOSTimes":"20180502T131049Z\n20180502T131049Z\n\n20180502T131049Z\n20180502T131049Z\n20180502T131049Z\n20180502T165629890Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":51,"StoryLogPreview":"<LYS Q1>","StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Bildebeskrivelse":"Bilder fra tre lag som deltar i fylkesmesterskap ( Vestfold) i barne- og ungdomsarbeiderfaget. lærlinger har ulike konkurranser med barna. dommere evaluerer","Fylke":"Vestfold","Innslagstittel":"Fylkesmesterskap i barne- og ungdomsarbeiderfaget","Kilde":"TV","Kommune":"Re","mosartTransition":"","mosartType":"FULL","OpprLand":"Norge","ReadTime":96.24,"Rettigheter":"Grønt","Rettighetseier":"NRK","Sted":"Re","Tags":"barne- og ungdomsarbeider; studier; yrkesfag; fylkesmesterskap","ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":2,"objID":"N23194_1525266622","mosID":"METADATA.NRK.MOS","mosAbstract":"M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget (02-05-18 15:10)","objSlug":"M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"changetime":"2018-05-02T15:10:21 +02:00","changedBy":"N23194","type":"video","mdSource":"omnibus","title":"Fylkesmesterskap i barne- og ungdomsarbeiderfaget","description":"Bilder fra tre lag som deltar i fylkesmesterskap ( Vestfold) i barne- og ungdomsarbeiderfaget. lærlinger har ulike konkurranser med barna. dommere evaluerer","hbbtv":{"link":""},"location":{"id":"1-46146","region":"Vestfold","lat":59.33946,"lon":10.23902,"$t":"Re"},"tag":[{"id":96183,"$t":"barne- og ungdomsarbeider"},{"id":5371,"$t":"studier"},{"id":6277,"$t":"yrkesfag"},{"id":95503,"$t":"fylkesmesterskap"}],"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"SAK BUSKERUD;SAK-14"}},{"Type":"storyItem","Content":{"itemID":13,"itemSlug":"FYLKESMESTERSKAP;MESTERSKAP-020518-TE-13","objID":"\\\\NDTE\\Omn\\C\\S\\24\\60","mosID":"OMNIBUS.NDTE.MOS","abstract":"MESTERSKAP-020518-TE NYHETER 00:01:36:06","objDur":4812,"objTB":50,"objSlug":"MESTERSKAP-020518-TE","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:07:00 | @M=Auto Timed | 01 ett navn | 1:Anne Melsom Bjerke | 2:reporter | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058417_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Anne Melsom Bjerke  2:reporter","mosObj":{"objID":"NYHETER\\00058417?version=1","objSlug":"01 ett navn 1:Anne Melsom Bjerke  2:reporter","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058417_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":3}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:19:00 | @M=Auto Timed | 01 ett navn | 1:Marius | 2: | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058418_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Marius  2:","mosObj":{"objID":"NYHETER\\00058418?version=1","objSlug":"01 ett navn 1:Marius  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058418_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":4}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:46:00 | @M=Auto Timed | 01 ett navn | 1:Hilde Abrahamsen | 2:Fagforbundet i Vestfold  | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058431_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold","mosObj":{"objID":"NYHETER\\00058431?version=1","objSlug":"01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058431_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":5}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:01:11:00 | @M=Auto Timed | 01 ett navn | 1:Sandra Blegeberg Sørsdahl | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058426_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider","mosObj":{"objID":"NYHETER\\00058426?version=1","objSlug":"01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058426_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":6}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:01:21:00 | @M=Auto Timed | 01 ett navn | 1:Juliane Svalestad | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058427_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider","mosObj":{"objID":"NYHETER\\00058427?version=1","objSlug":"01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058427_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":12}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:01:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Henrik Bøe | 3: | 4: | 00:00:05:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058428_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"24 foto/red 1:Foto og redigering:  2:Henrik Bøe","mosObj":{"objID":"NYHETER\\00058428?version=1","objSlug":"24 foto/red 1:Foto og redigering:  2:Henrik Bøe","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058428_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":7}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":8,"itemSlug":"SAK BUSKERUD;SAK-20"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:31.720Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;D215CE3F-0094-4D94-89F9B317ADB1387B","Slug":"Anmeldelse Hassel fengsel;tekst","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","ElapsedTime":33,"Estimated":20,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T163820Z","MOSAbstracts":"TIDSMARKØR IKKE RØR","MOSObjSlugs":"Story status","MOSSlugs":"SAK 1;intro-3","MOSTimes":"20180502T165636486Z","Owner":"LINUXENPS","Printed":"20180502T164204Z","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"(K2)  Minst ein Tilsett ved Hassel fengsel i Øvre Eiker er anmeldt til politiet av fengsels-leiinga, etter at en kollega sist helg varsla om kritikkverdige forhold.(***)","TextTime":34,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":2,"ReadTime":34,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:31.897Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;5BF7D6CA-2CF6-479B-B87B02595CAFE170","Slug":"Anmeldelse Hassel fengsel;HASSEL-020518S-TE","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T163821Z","MOSAbstracts":"METADATA\n HASSEL-020518S-TE NYHETER 00:00:23:11 \n_00:00:00:00 | @M=Auto Timed | 10 info | 1:Tilsett meldt til politiet | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations":"23,44\n0","MOSItemEdDurations":"","MOSObjSlugs":"M: \nHASSEL-020518S-TE\n10 info 1:Tilsett meldt til politiet  2:","MOSSlugs":"STK 2;STK-5\nAnmeldelse Hassel fengsel;STK-2\n10 info 1:Tilsett meldt til politiet  2:","MOSTimes":"","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Kilde":"TV","mosartType":"STK","OpprLand":"Norge","ReadTime":0,"Rettigheter":"Grønt","Team":"(Kun for STK:) Foto: / Redigering:","ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":4,"objID":"N11580_1412594672","mosID":"METADATA.NRK.MOS","mosAbstract":"METADATA","objSlug":"M:","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"type":"video","changedBy":"N11580","changetime":"2014-10-06T13:24:32 +02:00","title":{},"description":{},"hbbtv":{"link":""},"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"STK 2;STK-5"}},{"Type":"storyItem","Content":{"itemID":2,"itemSlug":"Anmeldelse Hassel fengsel;STK-2","objID":"\\\\NDTE\\Omn\\C\\S\\25\\11","mosID":"OMNIBUS.NDTE.MOS","abstract":"HASSEL-020518S-TE NYHETER 00:00:23:11","objDur":1172,"objTB":50,"objSlug":"HASSEL-020518S-TE","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":{},"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058484_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"10 info 1:Tilsett meldt til politiet  2:","mosObj":{"objID":"NYHETER\\00058484?version=1","objSlug":"10 info 1:Tilsett meldt til politiet  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058484_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":5}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:32.099Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;9E41486F-9E9A-421E-9EE410EE88DEF972","Slug":"Anmeldelse Hassel fengsel;HASSEL-020518-TE","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","ElapsedTime":33,"Estimated":25,"MediaTime":32.76,"ModBy":"N12914","ModTime":"20180502T163120Z","MOSAbstracts":"M: Fengselansatt anmeldt til politiet (02-05-18 18:11)\nHASSEL-020518F-TE NYHETER 00:00:32:19\n_00:00:02:00 | @M=Auto Timed | 01 ett navn | 1:Rita Kilvær | 2:regiondirektør, Kriminalomsorgen, region sør | 3: | 4: | 00:00:05:00\n_00:00:15:00 | @M=Auto Timed | 01 ett navn | 1:Fabian Skalleberg Nilsen | 2:reporter | 3: | 4: | 00:00:05:00\n_00:00:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto/redigering: | 2:Harald Inderhaug | 3: | 4: | 00:00:04:00\nTIDSMARKØR IKKE RØR","MOSItemDurations":"32,76\n0\n0\n0","MOSItemEdDurations":"","MOSObjSlugs":"M: Fengselansatt anmeldt til politiet\nHASSEL-020518F-TE\n01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør\n01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter\n24 foto/red 1:Foto/redigering:  2:Harald Inderhaug\nStory status","MOSSlugs":"STK 2;SYNK-5\nAnmeldelse Hassel fengsel;SYNK-2\n01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør\n01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter\n24 foto/red 1:Foto/redigering:  2:Harald Inderhaug\nREGISTERING stk - synk;SYNK-4","MOSTimes":"20180502T165736551Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Bildebeskrivelse":"skilt av fengselet, nærbilde av gårdsanlegg ved fengselet, låve, bil, totalutsnitt til slutt","Fylke":"Buskerud","Innslagstittel":"Fengselansatt anmeldt til politiet","Kilde":"TV","Kommune":"Øvre Eiker","mosartType":"FULL","OpprLand":"Norge","ReadTime":32.76,"Rettigheter":"Grønt","Rettighetseier":"NRK","Sted":"Skotselv","Tags":"fengsel; varsel; personalsak","ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":4,"objID":"N22778_1525277484","mosID":"METADATA.NRK.MOS","mosAbstract":"M: Fengselansatt anmeldt til politiet (02-05-18 18:11)","objSlug":"M: Fengselansatt anmeldt til politiet","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"changetime":"2018-05-02T18:11:24 +02:00","changedBy":"N22778","type":"video","mdSource":"omnibus","title":"Fengselansatt anmeldt til politiet","description":"skilt av fengselet, nærbilde av gårdsanlegg ved fengselet, låve, bil, totalutsnitt til slutt","hbbtv":{"link":""},"location":{"id":"1-71323","region":"Øvre Eiker, Buskerud","lat":59.84503,"lon":9.88406,"$t":"Skotselv"},"tag":[{"id":1306,"$t":"fengsel"},{"id":90383,"$t":"varsel"},{"id":4068,"$t":"personalsak"}],"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"STK 2;SYNK-5"}},{"Type":"storyItem","Content":{"itemID":2,"itemSlug":"Anmeldelse Hassel fengsel;SYNK-2","objID":"\\\\NDTE\\Omn\\C\\S\\25\\16","mosID":"OMNIBUS.NDTE.MOS","abstract":"HASSEL-020518F-TE NYHETER 00:00:32:19","objDur":1638,"objTB":50,"objSlug":"HASSEL-020518F-TE","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":{},"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058472_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør","mosObj":{"objID":"NYHETER\\00058472?version=1","objSlug":"01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058472_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":5}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":{},"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058474_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter","mosObj":{"objID":"NYHETER\\00058474?version=1","objSlug":"01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058474_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":7}},{"Type":"storyItem","Content":{"itemID":8,"itemSlug":"24 foto/red 1:Foto/redigering:  2:Harald Inderhaug","itemChannel":"CG1","mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto/redigering: | 2:Harald Inderhaug | 3: | 4: | 00:00:04:00","mosObj":{"objID":"NYHETER\\00058476?version=1","objSlug":"24 foto/red 1:Foto/redigering:  2:Harald Inderhaug","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058476_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":6,"itemSlug":"REGISTERING stk - synk;SYNK-4"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:32.305Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;A0A2BBD6-82EA-4418-A594524FE53C4E40","Slug":"VÆRET;tekst","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Break":0,"Creator":"LINUXENPS","ElapsedTime":45,"Estimated":20,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T163122Z","MOSAbstracts":"TIDSMARKØR IKKE RØR","MOSObjSlugs":"Story status","MOSSlugs":"SAK 1;intro-3","MOSTimes":"20180502T165740729Z","Owner":"LINUXENPS","Printed":"20180502T164204Z","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"(K2) Så skal me ta ein kikk på været.(***) Det er venta Sørøstleg bris og periodar med liten kuling på kysten. Regn store delar av dagen, før det skal bli oppholdsvær på kvelden.(***) I fjellet er det også venta sørøsteleg bris, og stiv kuling utsatte stader. Regn og sludd store delar av dagen. Det er også venta snøbyger over 800 meter. Før det skal bli lettare vær på kvelden.","TextTime":25,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":2,"ReadTime":25,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:32.510Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;DE1D32B4-8F10-4769-ACCC558EB9A44167","Slug":"VÆRET;VÆRPLAKAT-KYST","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T150734Z","MOSAbstracts":"M: Været (05-02-18 13:47)\n VARET-KYST-020518-TE NYHETER 00:00:28:07 \n_00:00:00:00 | @M=Auto Timed | 82 ticker meteorolog | 1: | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations":"28,28\n0","MOSItemEdDurations":"","MOSObjSlugs":"M: Været\nVARET-KYST-020518-TE\n82 ticker meteorolog 1:  2:","MOSSlugs":"STK 2;STK-5\nVÆRET;VÆRPLAKAT-KYST-2\n82 ticker meteorolog 1:  2:","MOSTimes":"20180502T131049Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Bildebeskrivelse":"","Innslagstittel":"Været","Kilde":"TV","mosartType":"STK","ReadTime":0,"Rettigheter":"Grønt","Rettighetseier":"NRK","ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":4,"objID":"N20248_1517834844","mosID":"METADATA.NRK.MOS","mosAbstract":"M: Været (05-02-18 13:47)","objSlug":"M: Været","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"changetime":"2018-02-05T13:47:23 +01:00","changedBy":"N20248","type":"video","mdSource":"omnibus","title":"Været","description":{},"hbbtv":{"link":""},"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"STK 2;STK-5"}},{"Type":"storyItem","Content":{"itemID":2,"itemSlug":"VÆRET;VÆRPLAKAT-KYST-2","objID":"\\\\NDTE\\Omn\\C\\S\\24\\65","mosID":"OMNIBUS.NDTE.MOS","abstract":"VARET-KYST-020518-TE NYHETER 00:00:28:07","objDur":1414,"objTB":50,"objSlug":"VARET-KYST-020518-TE","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}},{"Type":"storyItem","Content":{"itemID":5,"itemSlug":"82 ticker meteorolog 1:  2:","itemChannel":"CG1","mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:00:00 | @M=Auto Timed | 82 ticker meteorolog | 1: | 2: | 3: | 4: | 00:00:00:00","mosObj":{"objID":"NYHETER\\00053302?version=1","objSlug":"82 ticker meteorolog 1:  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/53000/Objects_NYHETER_00053302_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:32.718Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;1CFBCFBF-4713-461E-97AE2A3354FFBB2C","Slug":"VÆRET;VÆRPLAKAT-FJELLET","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T150733Z","MOSAbstracts":"VARET-FJELL-020518-TE NYHETER 00:00:26:22","MOSItemDurations":"26,88","MOSObjSlugs":"VARET-FJELL-020518-TE","MOSSlugs":"VÆRET;VÆRPLAKAT-FJELLET-2","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Kilde":"TV","mosartTransition":"mix 12","mosartType":"STK","OpprLand":"Norge","ReadTime":0,"Rettigheter":"Grønt","Team":"(Kun for STK:) Foto: / Redigering:","ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":2,"itemSlug":"VÆRET;VÆRPLAKAT-FJELLET-2","objID":"\\\\NDTE\\Omn\\C\\S\\24\\66","mosID":"OMNIBUS.NDTE.MOS","abstract":"VARET-FJELL-020518-TE NYHETER 00:00:26:22","objDur":1344,"objTB":50,"objSlug":"VARET-FJELL-020518-TE","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:32.915Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;A3D511ED-8C88-46AF-9CB9BA67630A5591","Slug":"KOMMER 2055;tekst","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","Estimated":15,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T163826Z","MOSAbstracts":"TIDSMARKØR IKKE RØR","MOSObjSlugs":"Story status","MOSSlugs":"SAK 1;intro-3","Owner":"LINUXENPS","Printed":"20180502T164204Z","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"Om drøye fire månader åpner dobbelsporet, som skal gje 22 minutter kortere togtid mellom Larvik og Porsgrunn. Me har vore med på testuren. Meir om det i  kåns neste sending.(*) Det var alt me hadde i denne omgang. Me er tilbake klokka 20:55. Takk for nå.","TextTime":17,"SystemApprovedBy":"N12914","mosartType":"","ReadTime":17,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:33.115Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;5C9D3E10-35DC-4DC5-84A799BA882F7389","Slug":"KOMMER 2055;HEAD-TOG","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T163127Z","MOSAbstracts":"METADATA\n HEAD-TOG NYHETER 00:00:24:16 \n_00:00:00:00 | @M=Auto Storyend | 09 teaser | 1:Se sendingen kl. 20.55 | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations":"24,64\n0","MOSItemEdDurations":"","MOSObjSlugs":"M: \nHEAD-TOG\n09 teaser 1:Se sendingen kl. 20.55  2:","MOSSlugs":"STK 2;STK-5\nKOMMER 2055;STK-2\n09 teaser 1:Se sendingen kl. 20.55  2:","MOSTimes":"","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Kilde":"TV","mosartTransition":"","mosartType":"STK","OpprLand":"Norge","ReadTime":0,"Rettigheter":"Grønt","Team":"(Kun for STK:) Foto: / Redigering:","ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":4,"objID":"N11580_1412594672","mosID":"METADATA.NRK.MOS","mosAbstract":"METADATA","objSlug":"M:","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"type":"video","changedBy":"N11580","changetime":"2014-10-06T13:24:32 +02:00","title":{},"description":{},"hbbtv":{"link":""},"rights":{"notes":"","owner":"NRK","$t":"Green"}}}},"itemSlug":"STK 2;STK-5"}},{"Type":"storyItem","Content":{"itemID":2,"itemSlug":"KOMMER 2055;STK-2","objID":"\\\\NDTE\\Omn\\C\\S\\25\\15","mosID":"OMNIBUS.NDTE.MOS","abstract":"HEAD-TOG NYHETER 00:00:24:16","objDur":1232,"objTB":50,"objSlug":"HEAD-TOG","mosExternalMetadata":{"mosSchema":"OMNIBUS"}}},{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":{},"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058479_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"09 teaser 1:Se sendingen kl. 20.55  2:","mosObj":{"objID":"NYHETER\\00058479?version=1","objSlug":"09 teaser 1:Se sendingen kl. 20.55  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058479_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":6}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:33.330Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;D7850305-1C4D-4D14-91FCE6327C3C0825","Slug":"TAKK FOR I KVELD;Takk for i kveld","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","ElapsedTime":7,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T154537Z","MOSAbstracts":"_00:00:00:01 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00\nTIDSMARKØR IKKE RØR","MOSItemDurations":0,"MOSItemEdDurations":"","MOSObjSlugs":"50 logo 1:  2:\nStory status","MOSSlugs":"TAKK FOR IKVELD + BILDEKOLLAGE;Takk for ikveld-20\nTAKK FOR IKVELD + BILDEKOLLAGE;seerbilder-18","MOSTimes":"20180502T131049Z\n20180502T165829637Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"TextTime":0,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":"TAKK2","ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:00:01 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010009_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"TAKK FOR IKVELD + BILDEKOLLAGE;Takk for ikveld-20","mosObj":{"objID":"NYHETER\\00010009?version=1","objSlug":"50 logo 1:  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010009_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":3}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":4,"itemSlug":"TAKK FOR IKVELD + BILDEKOLLAGE;seerbilder-18"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:33.520Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;0C1BCAED-D3C2-4671-B8E96F79860C6308","Slug":"TAKK FOR I KVELD;SLUTTPLAKAT start 18:58:50","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Actual":10,"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T132212Z","MOSAbstracts":"_00:00:00:00 | @M=Auto Openend | 67 sluttkredit kort | 1:Redaktør | 2:Stig Bolme | 3:Produsent | 4:Berit Heggholmen | 00:00:00:00\nTIDSMARKØR IKKE RØR","MOSItemDurations":0,"MOSItemEdDurations":"","MOSObjSlugs":"67 sluttkredit kort 1:Redaktør  2:Stig Bolme\nStory status","MOSSlugs":"67 sluttkredit kort 1:Redaktør  2:Stig Bolme\nTAKK FOR I KVELD;KAM-3","MOSTimes":"20180502T165829644Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"TextTime":0,"SystemApprovedBy":"N12914","mosartType":"KAM","mosartVariant":"SLUTTR3","ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":{},"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058432_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG1","itemSlug":"67 sluttkredit kort 1:Redaktør  2:Stig Bolme","mosObj":{"objID":"NYHETER\\00058432?version=1","objSlug":"67 sluttkredit kort 1:Redaktør  2:Stig Bolme","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","$t":"http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058432_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":5}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":4,"itemSlug":"TAKK FOR I KVELD;KAM-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:33.731Z"}
		// )
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;EF1A29D9-EF4C-4965-893A4910B2212E66","Slug":"AVSLUTT;Slutt 18.59.00","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T132213Z","MOSAbstracts":"TIDSMARKØR IKKE RØR","MOSObjSlugs":"Story status","MOSSlugs":"SAK 1;intro-3","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"TextTime":0,"SystemApprovedBy":"N12914","mosartType":"BREAK","ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":2,"itemSlug":"SAK 1;intro-3"}}],"level":"debug","message":"","timestamp":"2018-05-15T06:51:33.930Z"}
		// )


		// above this line

		// @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;1E3CAE45-F5D8-4378-AA627DF2C6089897","Slug":"NRK Østafjells;020518-1850","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Approved":1,"Creator":"LINUXENPS","MediaTime":0,"ModBy":"N12914","ModTime":"20180502T144559Z","MOSAbstracts":"_00:00:03:00 | @M=Auto Openend | 201 loop | 1: | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations":0,"MOSObjSlugs":"201 loop 1:  2:","MOSSlugs":"NRK ØSTAFJELLS;ddmm15-1845-3","MOSTimes":"20180502T131049Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"<BAK KLARHD<00:01>>","TextTime":0,"SystemApprovedBy":"N12914","mosartType":"BREAK","ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"mosID":"chyron.techycami02.ndte.nrk.mos","abstract":"_00:00:03:00 | @M=Auto Openend | 201 loop | 1: | 2: | 3: | 4: | 00:00:00:00","objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","_t":"http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010001_v1_big.jpg"},"objMetadataPath":{}},"itemChannel":"CG2","itemSlug":"NRK ØSTAFJELLS;ddmm15-1845-3","mosObj":{"objID":"NYHETER\\00010001?version=1","objSlug":"201 loop 1:  2:","mosItemEditorProgID":"Chymox.AssetBrowser.1","objDur":0,"objTB":0,"objPaths":{"objProxyPath":{"techDescription":"JPEG Thumbnail","_t":"http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010001_v1_big.jpg"},"objMetadataPath":{}},"mosExternalMetadata":{"mosSchema":"http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID":3}}],"level":"debug","message":"mosRoFullStory","timestamp":"2018-05-09T10:26:42.951Z"			}
		// )
		// @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token,
		// 	{"ID":"MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;9141DBA1-93DD-4B19-BEBB32E0D6222E1B","Slug":"ÅPNING;vignett","MosExternalMetaData":[{"MosScope":"PLAYLIST","MosSchema":"http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload":{"Actual":4,"Approved":1,"Creator":"LINUXENPS","ElapsedTime":3,"MediaTime":0,"ModBy":"N12914","ModTime":"20180502T144559Z","MOSAbstracts":"M: NRK Østafjells(20-04-16 09:07)\nTIDSMARKØR IKKE RØR","MOSItemDurations":"","MOSItemEdDurations":"","MOSObjSlugs":"M: NRK Østafjells\nStory status","MOSSlugs":"VIGNETT;vignett-5\nVIGNETT;vignett-3","MOSTimes":"20180502T165008720Z","Owner":"LINUXENPS","SourceMediaTime":0,"SourceTextTime":0,"StoryLogPreview":"<LYS Q1>","StoryProducer":"DKTE","TextTime":0,"SystemApprovedBy":"N12914","Kilde":"TV","mosartType":"FULL","mosartVariant":"VIGNETT2018","ReadTime":0,"ENPSItemType":3}}],"RunningOrderId":"MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body":[{"Type":"storyItem","Content":{"itemID":9,"objID":"N11580_1461136025","mosID":"METADATA.NRK.MOS","mosAbstract":"M: NRK Østafjells (20-04-16 09:07)","objSlug":"M: NRK Østafjells","mosExternalMetadata":{"mosScope":"PLAYLIST","mosSchema":"http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload":{"nrk":{"type":"video","changedBy":"N11580","changetime":"2016-04-20T09:07:05 +02:00","mdSource":"ncs","title":"NRK Østafjells","description":{},"hbbtv":{"link":""},"rights":{"notes":"","owner":"NRK","_t":"Green"}}}},"itemSlug":"VIGNETT;vignett-5"}},{"Type":"storyItem","Content":{"mosID":"mosart.morten.mos","abstract":"TIDSMARKØR IKKE RØR","objID":"STORYSTATUS","objSlug":"Story status","itemID":10,"itemSlug":"VIGNETT;vignett-3"}}],"level":"debug","message":"mosRoFullStory","timestamp":"2018-05-09T10:26:43.127Z"}
		// )
		// @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;6364CE48-9B6A-4D36-B7F8352E6E11EDB7","Slug": "HEAD;head-hundepose-020518","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 5,"Estimated": 10,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163055Z","MOSAbstracts": "head-hundepose-020518-te NYHETER 00:00:11:19 \n_00:00:00:00 | @M=Auto Openend | 52 headline | 1:Vil ikkje ha poser til hundebæsj | 2:Østafjells | 3: | 4: | 00:00:07:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": "11,76\n0","MOSItemEdDurations": "","MOSObjSlugs": "head-hundepose-020518-te\n52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells\nStory status","MOSSlugs": "HEAD;head-Bæsjepose-4\n52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells\nSAK VESTFOLD;head-3","MOSTimes": "20180502T165013906Z","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "Miljøpartiet vil droppe posen til hundebæsjen - slik vil dei spare miljøet.","StoryProducer": "DKTE","TextTime": 5,"SystemApprovedBy": "N12914","Kilde": "TV","mosartType": "STK","mosartVariant": "HEAD","OpprLand": "Norge","ReadTime": 5,"Rettigheter": "Grønt","Team": "(Kun for STK:) Foto: / Redigering:","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"itemSlug": "HEAD;head-Bæsjepose-4","objID": "\\\\NDTE\\Omn\\C\\S\\25\\07","mosID": "OMNIBUS.NDTE.MOS","abstract": "head-hundepose-020518-te NYHETER 00:00:11:19","objDur": 588,"objTB": 50,"objSlug": "head-hundepose-020518-te","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": {},"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058473_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells","mosObj": {"objID": "NYHETER\\00058473?version=1","objSlug": "52 headline 1:Vil ikkje ha poser til hundebæsj  2:Østafjells","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058473_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 2}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 3,"itemSlug": "SAK VESTFOLD;head-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:43.331Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;4CBE86C0-9A69-4EF4-81F8E8CD275092E8","Slug": "HEAD;head-mesterskap-020518-te","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 7,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T144554Z","MOSAbstracts": "head-mesterskap-020518-te NYHETER 00:00:12:13 \n_00:00:00:00 | @M=Auto Openend | 52 headline | 1:Fylkesmeisterskap i Vestfold | 2:Østafjells | 3: | 4: | 00:00:07:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": "12,52\n0","MOSItemEdDurations": "","MOSObjSlugs": "head-mesterskap-020518-te\n52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells\nStory status","MOSSlugs": "FYLKESMESTERSKAP;head-mesterskap-020518-te-4\n52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells\nSAK VESTFOLD;head-3","MOSTimes": "20180502T165021004Z","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "Lærlingar konkurrerte i barne- og ungdomsarbeiderfaget. Arrangementet skal skape blest rundt yrket.","StoryProducer": "DKTE","TextTime": 7,"SystemApprovedBy": "N12914","Kilde": "TV","mosartType": "STK","mosartVariant": "HEAD","OpprLand": "Norge","ReadTime": 7,"Rettigheter": "Grønt","Team": "(Kun for STK:) Foto: / Redigering:","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"itemSlug": "FYLKESMESTERSKAP;head-mesterskap-020518-te-4","objID": "\\\\NDTE\\Omn\\C\\S\\24\\61","mosID": "OMNIBUS.NDTE.MOS","abstract": "head-mesterskap-020518-te NYHETER 00:00:12:13","objDur": 626,"objTB": 50,"objSlug": "head-mesterskap-020518-te","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"itemID": 5,"itemSlug": "52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells","itemChannel": "CG1","mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:00:00 | @M=Auto Openend | 52 headline | 1:Fylkesmeisterskap i Vestfold | 2:Østafjells | 3: | 4: | 00:00:07:00","mosObj": {"objID": "NYHETER\\00058435?version=1","objSlug": "52 headline 1:Fylkesmeisterskap i Vestfold  2:Østafjells","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058435_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 3,"itemSlug": "SAK VESTFOLD;head-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:43.540Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;8B0D9EE2-EF9A-472F-80C6DD2CCDCFC2E6","Slug": "ÅPNING;velkommen","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 5,"Estimated": 0,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T154626Z","MOSAbstracts": "_00:00:00:00 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": 0,"MOSItemEdDurations": "","MOSObjSlugs": "50 logo 1:  2:\nStory status","MOSSlugs": "50 logo 1:  2:\nVelkommen;velkommen-4","MOSTimes": "20180502T131049Z\n20180502T165026622Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "<BAK FADE<00:01:12>>","TextTime": 0,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": "ÅPNING3","ReadTime": 0,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:00:00 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/16000/Objects_NYHETER_00016967_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "50 logo 1:  2:","mosObj": {"objID": "NYHETER\\00016967?version=1","objSlug": "50 logo 1:  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/16000/Objects_NYHETER_00016967_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 3}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 5,"itemSlug": "Velkommen;velkommen-4"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:43.739Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;BD68FC84-9654-4E3E-B799104C28B28CAB","Slug": "DROPP BÆSJEPOSE;inn","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 8,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163051Z","MOSAbstracts": "_00:00:00:00 | @M=Auto Storyend | 202 bilde | 1:0205-hundebæsj | 2: | 3: | 4: | 00:00:00:00\n_00:00:02:00 | @M=Auto Timed | 01 ett navn | 1:Martin Torstveit | 2:2.mai 2018 | 3: | 4: | 00:00:05:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": "0\n0","MOSItemEdDurations": "","MOSObjSlugs": "202 bilde 1:0205-hundebæsj  2:\n01 ett navn 1:Martin Torstveit  2:2.mai 2018\nStory status","MOSSlugs": "202 bilde 1:0205-hundebæsj  2:\n01 ett navn 1:Martin Torstveit  2:2.mai 2018\nSAK 1;intro-3","MOSTimes": "20180502T165034836Z","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "(K3) God kveld og velkommen. Folk bør la hundebæsjen bli liggande når dei er ute og lufter bikkja. Det meiner Miljøpartiet De Grønne. Partiet meiner det kan redusere mengden poser me kaster i søpla.","TextTime": 13,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": 3,"ReadTime": 13,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"itemSlug": "202 bilde 1:0205-hundebæsj  2:","itemChannel": "CG2","mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:00:00 | @M=Auto Storyend | 202 bilde | 1:0205-hundebæsj | 2: | 3: | 4: | 00:00:00:00","mosObj": {"objID": "NYHETER\\00058461?version=1","objSlug": "202 bilde 1:0205-hundebæsj  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058461_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:02:00 | @M=Auto Timed | 01 ett navn | 1:Martin Torstveit | 2:2.mai 2018 | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058439_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Martin Torstveit  2:2.mai 2018","mosObj": {"objID": "NYHETER\\00058439?version=1","objSlug": "01 ett navn 1:Martin Torstveit  2:2.mai 2018","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058439_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 3}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:43.942Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;FBB8E962-3DB5-4C92-AD7CA00B33710D1C","Slug": "DROPP BÆSJEPOSE;HUNDEPOSE-020518-te","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 114,"Estimated": 114,"MediaTime": 114.52,"ModBy": "N12914","ModTime": "20180502T163049Z","MOSAbstracts": "METADATA\n HUNDEPOSE-020518-TE NYHETER 00:01:54:13 \n_00:00:02:00 | @M=Manual Timed | 01 ett navn | 1:Maria Kommandantvold | 2:reporter | 3: | 4: | 00:00:05:00\n_00:00:24:11 | @M=Auto Timed | 01 ett navn | 1:Christina Albrecht Olsen | 2:Sankt Hansberget barnehage | 3: | 4: | 00:00:04:00\n_00:00:45:00 | @M=Auto Timed | 01 ett navn | 1:Hanne Lisa Matt | 2:Miljøpartiet De Grønne | 3: | 4: | 00:00:05:00\n_00:01:06:00 | @M=Auto Timed | 01 ett navn | 1:Louise Abel Morberg | 2:hundeeier | 3: | 4: | 00:00:05:00\n_00:01:47:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Tordis Gauteplass | 3: | 4: | 00:00:04:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": "114,52\n0\n0\n0\n0\n0","MOSItemEdDurations": "","MOSObjSlugs": "M: \nHUNDEPOSE-020518-TE\n01 ett navn 1:Maria Kommandantvold  2:reporter\n01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage\n01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne\n01 ett navn 1:Louise Abel Morberg  2:hundeeier\n24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass\nStory status","MOSSlugs": "SAK BUSKERUD;SAK-14\nDROPP BÆSJEPOSE;HUNDEPOSE-020518-te-12\n01 ett navn 1:Maria Kommandantvold  2:reporter\n01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage\n01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne\n01 ett navn 1:Louise Abel Morberg  2:hundeeier\n24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass\nSAK BUSKERUD;SAK-20","MOSTimes": "20180502T165229810Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Kilde": "TV","mosartTransition": "","mosartType": "FULL","ReadTime": 114.52,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 2,"objID": "N11580_1412594672","mosID": "METADATA.NRK.MOS","mosAbstract": "METADATA","objSlug": "M:","mosExternalMetadata": {"mosScope": "PLAYLIST","mosSchema": "http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload": {"nrk": {"type": "video","changedBy": "N11580","changetime": "2014-10-06T13:24:32 +02:00","title": {},"description": {},"hbbtv": {"link": ""},"rights": {"notes": "","owner": "NRK","_t": "Green"}}}},"itemSlug": "SAK BUSKERUD;SAK-14"}},{"Type": "storyItem","Content": {"itemID": 12,"itemSlug": "DROPP BÆSJEPOSE;HUNDEPOSE-020518-te-12","objID": "\\\\NDTE\\Omn\\C\\S\\24\\70","mosID": "OMNIBUS.NDTE.MOS","abstract": "HUNDEPOSE-020518-TE NYHETER 00:01:54:13","objDur": 5726,"objTB": 50,"objSlug": "HUNDEPOSE-020518-TE","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:02:00 | @M=Manual Timed | 01 ett navn | 1:Maria Kommandantvold | 2:reporter | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058457_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Maria Kommandantvold  2:reporter","mosObj": {"objID": "NYHETER\\00058457?version=1","objSlug": "01 ett navn 1:Maria Kommandantvold  2:reporter","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058457_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 9}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:24:11 | @M=Auto Timed | 01 ett navn | 1:Christina Albrecht Olsen | 2:Sankt Hansberget barnehage | 3: | 4: | 00:00:04:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058464_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage","mosObj": {"objID": "NYHETER\\00058464?version=1","objSlug": "01 ett navn 1:Christina Albrecht Olsen  2:Sankt Hansberget barnehage","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058464_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 11}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:45:00 | @M=Auto Timed | 01 ett navn | 1:Hanne Lisa Matt | 2:Miljøpartiet De Grønne | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058458_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne","mosObj": {"objID": "NYHETER\\00058458?version=1","objSlug": "01 ett navn 1:Hanne Lisa Matt  2:Miljøpartiet De Grønne","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058458_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 4}},{"Type": "storyItem","Content": {"itemID": 14,"itemSlug": "01 ett navn 1:Louise Abel Morberg  2:hundeeier","itemChannel": "CG1","mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:01:06:00 | @M=Auto Timed | 01 ett navn | 1:Louise Abel Morberg | 2:hundeeier | 3: | 4: | 00:00:05:00","mosObj": {"objID": "NYHETER\\00058478?version=1","objSlug": "01 ett navn 1:Louise Abel Morberg  2:hundeeier","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058478_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:01:47:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Tordis Gauteplass | 3: | 4: | 00:00:04:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058463_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass","mosObj": {"objID": "NYHETER\\00058463?version=1","objSlug": "24 foto/red 1:Foto og redigering:  2:Tordis Gauteplass","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058463_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 7}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 8,"itemSlug": "SAK BUSKERUD;SAK-20"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:44.155Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;637F3BE2-8154-4E00-ABEBE2C0AED642E8","Slug": "INNSAMLING;tekst","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 17,"Estimated": 20,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T164244Z","MOSAbstracts": "TIDSMARKØR IKKE RØR","MOSObjSlugs": "Story status","MOSSlugs": "SAK 1;intro-3","MOSTimes": "20180502T165235816Z","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "(K2) Larvik håndballklubb har fått inn omkring 2,5 millioner kroner i gåvepengar, (***) som skal redde klubben frå konkurs.\nKlubben manglar likevel omlag 500.000 kroner for å nå målet på tre millionar kroner.","TextTime": 18,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": 2,"ReadTime": 18,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:44.338Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;79588F90-8422-4FB7-8EC199E3CB93BEA4","Slug": "INNSAMLING;LARVIK-KONKURS","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T150756Z","MOSAbstracts": "METADATA\n LARVIK-KONKURS-020518S-TE NYHETER 00:00:30:01 \n_00:00:00:00 | @M=Auto Timed | 10 info | 1:Larvik treng pengar | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations": "30,04\n0","MOSItemEdDurations": "","MOSObjSlugs": "M: \nLARVIK-KONKURS-020518S-TE\n10 info 1:Larvik treng pengar  2:","MOSSlugs": "STK 1;STK-5\nINNSAMLING;STK-2\n10 info 1:Larvik treng pengar  2:","MOSTimes": "","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Kilde": "TV","mosartType": "STK","OpprLand": "Norge","ReadTime": 0,"Rettigheter": "Grønt","Team": "(Kun for STK:) Foto: / Redigering:","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"objID": "N11580_1412594672","mosID": "METADATA.NRK.MOS","mosAbstract": "METADATA","objSlug": "M:","mosExternalMetadata": {"mosScope": "PLAYLIST","mosSchema": "http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload": {"nrk": {"type": "video","changedBy": "N11580","changetime": "2014-10-06T13:24:32 +02:00","title": {},"description": {},"hbbtv": {"link": ""},"rights": {"notes": "","owner": "NRK","_t": "Green"}}}},"itemSlug": "STK 1;STK-5"}},{"Type": "storyItem","Content": {"itemID": 2,"itemSlug": "INNSAMLING;STK-2","objID": "\\\\NDTE\\Omn\\C\\S\\24\\64","mosID": "OMNIBUS.NDTE.MOS","abstract": "LARVIK-KONKURS-020518S-TE NYHETER 00:00:30:01","objDur": 1502,"objTB": 50,"objSlug": "LARVIK-KONKURS-020518S-TE","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:00:00 | @M=Auto Timed | 10 info | 1:Larvik treng pengar | 2: | 3: | 4: | 00:00:00:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058452_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "10 info 1:Larvik treng pengar  2:","mosObj": {"objID": "NYHETER\\00058452?version=1","objSlug": "10 info 1:Larvik treng pengar  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058452_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 5}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:44.577Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;E60ED2B4-1BC1-4327-98E4DC0070B42795","Slug": "INNSAMLING;gjest","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Actual": 120,"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 109,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T143332Z","MOSAbstracts": "_00:02:00:00 | @M=Manual Timed | 01 ett navn | 1:Cathrine Svendsen | 2:styreleder, LHK | 3: | 4: | 00:00:00:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": 0,"MOSItemEdDurations": "","MOSObjSlugs": "01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK\nStory status","MOSSlugs": "01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK\nSAK 1;intro-3","MOSTimes": "20180502T165437473Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"TextTime": 0,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": 3,"ReadTime": 0,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": {},"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058436_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK","mosObj": {"objID": "NYHETER\\00058436?version=1","objSlug": "01 ett navn 1:Cathrine Svendsen  2:styreleder, LHK","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058436_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 3}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:44.755Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;52915640-EDC4-4CF3-92D0F9D41FC26A6E","Slug": "FYLKESMESTERSKAP;inn","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 15,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163813Z","MOSAbstracts": "TIDSMARKØR IKKE RØR","MOSObjSlugs": "Story status","MOSSlugs": "SAK 1;intro-3","MOSTimes": "20180502T165453205Z","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "(K2) I dag blei det arrangert fylkesmesterskap i barne- og ungdomsarbeiderfaget i Re kommune i Vestfold. \nGjennom forskjellige konkurransar fekk lærlingar vist fram sine ferdigheter.","TextTime": 18,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": 2,"ReadTime": 18,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:44.948Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;E13788E2-5F04-4014-A6F8001F35CFFBB4","Slug": "FYLKESMESTERSKAP;MESTERSKAP-020518-TE","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 96,"Estimated": 110,"MediaTime": 96.24,"ModBy": "N12914","ModTime": "20180502T144537Z","MOSAbstracts": "M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget (02-05-18 15:10)\n MESTERSKAP-020518-TE NYHETER 00:01:36:06 \n_00:00:07:00 | @M=Auto Timed | 01 ett navn | 1:Anne Melsom Bjerke | 2:reporter | 3: | 4: | 00:00:05:00\n_00:00:19:00 | @M=Auto Timed | 01 ett navn | 1:Marius | 2: | 3: | 4: | 00:00:05:00\n_00:00:46:00 | @M=Auto Timed | 01 ett navn | 1:Hilde Abrahamsen | 2:Fagforbundet i Vestfold  | 3: | 4: | 00:00:05:00\n_00:01:11:00 | @M=Auto Timed | 01 ett navn | 1:Sandra Blegeberg Sørsdahl | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00\n_00:01:21:00 | @M=Auto Timed | 01 ett navn | 1:Juliane Svalestad | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00\n_00:01:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Henrik Bøe | 3: | 4: | 00:00:05:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": "96,24\n0\n0\n0\n0\n0\n0","MOSItemEdDurations": "","MOSObjSlugs": "M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget\nMESTERSKAP-020518-TE\n01 ett navn 1:Anne Melsom Bjerke  2:reporter\n01 ett navn 1:Marius  2:\n01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold \n01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider\n01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider\n24 foto/red 1:Foto og redigering:  2:Henrik Bøe\nStory status","MOSSlugs": "SAK BUSKERUD;SAK-14\nFYLKESMESTERSKAP;MESTERSKAP-020518-TE-13\n01 ett navn 1:Anne Melsom Bjerke  2:reporter\n01 ett navn 1:Marius  2:\n01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold \n01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider\n01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider\n24 foto/red 1:Foto og redigering:  2:Henrik Bøe\nSAK BUSKERUD;SAK-20","MOSTimes": "20180502T131049Z\n20180502T131049Z\n\n20180502T131049Z\n20180502T131049Z\n20180502T131049Z\n20180502T165629890Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 51,"StoryLogPreview": "<LYS Q1>","StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Bildebeskrivelse": "Bilder fra tre lag som deltar i fylkesmesterskap ( Vestfold) i barne- og ungdomsarbeiderfaget. lærlinger har ulike konkurranser med barna. dommere evaluerer","Fylke": "Vestfold","Innslagstittel": "Fylkesmesterskap i barne- og ungdomsarbeiderfaget","Kilde": "TV","Kommune": "Re","mosartTransition": "","mosartType": "FULL","OpprLand": "Norge","ReadTime": 96.24,"Rettigheter": "Grønt","Rettighetseier": "NRK","Sted": "Re","Tags": "barne- og ungdomsarbeider; studier; yrkesfag; fylkesmesterskap","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 2,"objID": "N23194_1525266622","mosID": "METADATA.NRK.MOS","mosAbstract": "M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget (02-05-18 15:10)","objSlug": "M: Fylkesmesterskap i barne- og ungdomsarbeiderfaget","mosExternalMetadata": {"mosScope": "PLAYLIST","mosSchema": "http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload": {"nrk": {"changetime": "2018-05-02T15:10:21 +02:00","changedBy": "N23194","type": "video","mdSource": "omnibus","title": "Fylkesmesterskap i barne- og ungdomsarbeiderfaget","description": "Bilder fra tre lag som deltar i fylkesmesterskap ( Vestfold) i barne- og ungdomsarbeiderfaget. lærlinger har ulike konkurranser med barna. dommere evaluerer","hbbtv": {"link": ""},"location": {"id": "1-46146","region": "Vestfold","lat": 59.33946,"lon": 10.23902,"_t": "Re"},"tag": [{"id": 96183,"_t": "barne- og ungdomsarbeider"},{"id": 5371,"_t": "studier"},{"id": 6277,"_t": "yrkesfag"},{"id": 95503,"_t": "fylkesmesterskap"}],"rights": {"notes": "","owner": "NRK","_t": "Green"}}}},"itemSlug": "SAK BUSKERUD;SAK-14"}},{"Type": "storyItem","Content": {"itemID": 13,"itemSlug": "FYLKESMESTERSKAP;MESTERSKAP-020518-TE-13","objID": "\\\\NDTE\\Omn\\C\\S\\24\\60","mosID": "OMNIBUS.NDTE.MOS","abstract": "MESTERSKAP-020518-TE NYHETER 00:01:36:06","objDur": 4812,"objTB": 50,"objSlug": "MESTERSKAP-020518-TE","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:07:00 | @M=Auto Timed | 01 ett navn | 1:Anne Melsom Bjerke | 2:reporter | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058417_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Anne Melsom Bjerke  2:reporter","mosObj": {"objID": "NYHETER\\00058417?version=1","objSlug": "01 ett navn 1:Anne Melsom Bjerke  2:reporter","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058417_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 3}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:19:00 | @M=Auto Timed | 01 ett navn | 1:Marius | 2: | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058418_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Marius  2:","mosObj": {"objID": "NYHETER\\00058418?version=1","objSlug": "01 ett navn 1:Marius  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058418_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 4}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:46:00 | @M=Auto Timed | 01 ett navn | 1:Hilde Abrahamsen | 2:Fagforbundet i Vestfold  | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058431_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold","mosObj": {"objID": "NYHETER\\00058431?version=1","objSlug": "01 ett navn 1:Hilde Abrahamsen  2:Fagforbundet i Vestfold","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058431_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 5}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:01:11:00 | @M=Auto Timed | 01 ett navn | 1:Sandra Blegeberg Sørsdahl | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058426_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider","mosObj": {"objID": "NYHETER\\00058426?version=1","objSlug": "01 ett navn 1:Sandra Blegeberg Sørsdahl  2:lærling, barne- og ungdomsarbeider","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058426_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 6}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:01:21:00 | @M=Auto Timed | 01 ett navn | 1:Juliane Svalestad | 2:lærling, barne- og ungdomsarbeider | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058427_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider","mosObj": {"objID": "NYHETER\\00058427?version=1","objSlug": "01 ett navn 1:Juliane Svalestad  2:lærling, barne- og ungdomsarbeider","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058427_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 12}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:01:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto og redigering: | 2:Henrik Bøe | 3: | 4: | 00:00:05:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058428_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "24 foto/red 1:Foto og redigering:  2:Henrik Bøe","mosObj": {"objID": "NYHETER\\00058428?version=1","objSlug": "24 foto/red 1:Foto og redigering:  2:Henrik Bøe","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058428_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 7}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 8,"itemSlug": "SAK BUSKERUD;SAK-20"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:45.189Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;D215CE3F-0094-4D94-89F9B317ADB1387B","Slug": "Anmeldelse Hassel fengsel;tekst","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 33,"Estimated": 20,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163820Z","MOSAbstracts": "TIDSMARKØR IKKE RØR","MOSObjSlugs": "Story status","MOSSlugs": "SAK 1;intro-3","MOSTimes": "20180502T165636486Z","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "(K2)  Minst ein Tilsett ved Hassel fengsel i Øvre Eiker er anmeldt til politiet av fengsels-leiinga, etter at en kollega sist helg varsla om kritikkverdige forhold.(***)","TextTime": 34,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": 2,"ReadTime": 34,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:45.358Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;5BF7D6CA-2CF6-479B-B87B02595CAFE170","Slug": "Anmeldelse Hassel fengsel;HASSEL-020518S-TE","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163821Z","MOSAbstracts": "METADATA\n HASSEL-020518S-TE NYHETER 00:00:23:11 \n_00:00:00:00 | @M=Auto Timed | 10 info | 1:Tilsett meldt til politiet | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations": "23,44\n0","MOSItemEdDurations": "","MOSObjSlugs": "M: \nHASSEL-020518S-TE\n10 info 1:Tilsett meldt til politiet  2:","MOSSlugs": "STK 2;STK-5\nAnmeldelse Hassel fengsel;STK-2\n10 info 1:Tilsett meldt til politiet  2:","MOSTimes": "","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Kilde": "TV","mosartType": "STK","OpprLand": "Norge","ReadTime": 0,"Rettigheter": "Grønt","Team": "(Kun for STK:) Foto: / Redigering:","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"objID": "N11580_1412594672","mosID": "METADATA.NRK.MOS","mosAbstract": "METADATA","objSlug": "M:","mosExternalMetadata": {"mosScope": "PLAYLIST","mosSchema": "http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload": {"nrk": {"type": "video","changedBy": "N11580","changetime": "2014-10-06T13:24:32 +02:00","title": {},"description": {},"hbbtv": {"link": ""},"rights": {"notes": "","owner": "NRK","_t": "Green"}}}},"itemSlug": "STK 2;STK-5"}},{"Type": "storyItem","Content": {"itemID": 2,"itemSlug": "Anmeldelse Hassel fengsel;STK-2","objID": "\\\\NDTE\\Omn\\C\\S\\25\\11","mosID": "OMNIBUS.NDTE.MOS","abstract": "HASSEL-020518S-TE NYHETER 00:00:23:11","objDur": 1172,"objTB": 50,"objSlug": "HASSEL-020518S-TE","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": {},"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058484_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "10 info 1:Tilsett meldt til politiet  2:","mosObj": {"objID": "NYHETER\\00058484?version=1","objSlug": "10 info 1:Tilsett meldt til politiet  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058484_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 5}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:45.567Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;9E41486F-9E9A-421E-9EE410EE88DEF972","Slug": "Anmeldelse Hassel fengsel;HASSEL-020518-TE","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 33,"Estimated": 25,"MediaTime": 32.76,"ModBy": "N12914","ModTime": "20180502T163120Z","MOSAbstracts": "M: Fengselansatt anmeldt til politiet (02-05-18 18:11)\nHASSEL-020518F-TE NYHETER 00:00:32:19\n_00:00:02:00 | @M=Auto Timed | 01 ett navn | 1:Rita Kilvær | 2:regiondirektør, Kriminalomsorgen, region sør | 3: | 4: | 00:00:05:00\n_00:00:15:00 | @M=Auto Timed | 01 ett navn | 1:Fabian Skalleberg Nilsen | 2:reporter | 3: | 4: | 00:00:05:00\n_00:00:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto/redigering: | 2:Harald Inderhaug | 3: | 4: | 00:00:04:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": "32,76\n0\n0\n0","MOSItemEdDurations": "","MOSObjSlugs": "M: Fengselansatt anmeldt til politiet\nHASSEL-020518F-TE\n01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør\n01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter\n24 foto/red 1:Foto/redigering:  2:Harald Inderhaug\nStory status","MOSSlugs": "STK 2;SYNK-5\nAnmeldelse Hassel fengsel;SYNK-2\n01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør\n01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter\n24 foto/red 1:Foto/redigering:  2:Harald Inderhaug\nREGISTERING stk - synk;SYNK-4","MOSTimes": "20180502T165736551Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Bildebeskrivelse": "skilt av fengselet, nærbilde av gårdsanlegg ved fengselet, låve, bil, totalutsnitt til slutt","Fylke": "Buskerud","Innslagstittel": "Fengselansatt anmeldt til politiet","Kilde": "TV","Kommune": "Øvre Eiker","mosartType": "FULL","OpprLand": "Norge","ReadTime": 32.76,"Rettigheter": "Grønt","Rettighetseier": "NRK","Sted": "Skotselv","Tags": "fengsel; varsel; personalsak","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"objID": "N22778_1525277484","mosID": "METADATA.NRK.MOS","mosAbstract": "M: Fengselansatt anmeldt til politiet (02-05-18 18:11)","objSlug": "M: Fengselansatt anmeldt til politiet","mosExternalMetadata": {"mosScope": "PLAYLIST","mosSchema": "http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload": {"nrk": {"changetime": "2018-05-02T18:11:24 +02:00","changedBy": "N22778","type": "video","mdSource": "omnibus","title": "Fengselansatt anmeldt til politiet","description": "skilt av fengselet, nærbilde av gårdsanlegg ved fengselet, låve, bil, totalutsnitt til slutt","hbbtv": {"link": ""},"location": {"id": "1-71323","region": "Øvre Eiker, Buskerud","lat": 59.84503,"lon": 9.88406,"_t": "Skotselv"},"tag": [{"id": 1306,"_t": "fengsel"},{"id": 90383,"_t": "varsel"},{"id": 4068,"_t": "personalsak"}],"rights": {"notes": "","owner": "NRK","_t": "Green"}}}},"itemSlug": "STK 2;SYNK-5"}},{"Type": "storyItem","Content": {"itemID": 2,"itemSlug": "Anmeldelse Hassel fengsel;SYNK-2","objID": "\\\\NDTE\\Omn\\C\\S\\25\\16","mosID": "OMNIBUS.NDTE.MOS","abstract": "HASSEL-020518F-TE NYHETER 00:00:32:19","objDur": 1638,"objTB": 50,"objSlug": "HASSEL-020518F-TE","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": {},"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058472_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør","mosObj": {"objID": "NYHETER\\00058472?version=1","objSlug": "01 ett navn 1:Rita Kilvær  2:regiondirektør, Kriminalomsorgen, region sør","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058472_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 5}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": {},"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058474_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter","mosObj": {"objID": "NYHETER\\00058474?version=1","objSlug": "01 ett navn 1:Fabian Skalleberg Nilsen  2:reporter","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058474_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 7}},{"Type": "storyItem","Content": {"itemID": 8,"itemSlug": "24 foto/red 1:Foto/redigering:  2:Harald Inderhaug","itemChannel": "CG1","mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:27:00 | @M=Auto Timed | 24 foto/red | 1:Foto/redigering: | 2:Harald Inderhaug | 3: | 4: | 00:00:04:00","mosObj": {"objID": "NYHETER\\00058476?version=1","objSlug": "24 foto/red 1:Foto/redigering:  2:Harald Inderhaug","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058476_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 6,"itemSlug": "REGISTERING stk - synk;SYNK-4"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:45.778Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;A0A2BBD6-82EA-4418-A594524FE53C4E40","Slug": "VÆRET;tekst","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 45,"Estimated": 20,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163122Z","MOSAbstracts": "TIDSMARKØR IKKE RØR","MOSObjSlugs": "Story status","MOSSlugs": "SAK 1;intro-3","MOSTimes": "20180502T165740729Z","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "(K2) Så skal me ta ein kikk på været.(***) Det er venta Sørøstleg bris og periodar med liten kuling på kysten. Regn store delar av dagen, før det skal bli oppholdsvær på kvelden.(***) I fjellet er det også venta sørøsteleg bris, og stiv kuling utsatte stader. Regn og sludd store delar av dagen. Det er også venta snøbyger over 800 meter. Før det skal bli lettare vær på kvelden.","TextTime": 25,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": 2,"ReadTime": 25,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:45.975Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;DE1D32B4-8F10-4769-ACCC558EB9A44167","Slug": "VÆRET;VÆRPLAKAT-KYST","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T150734Z","MOSAbstracts": "M: Været (05-02-18 13:47)\n VARET-KYST-020518-TE NYHETER 00:00:28:07 \n_00:00:00:00 | @M=Auto Timed | 82 ticker meteorolog | 1: | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations": "28,28\n0","MOSItemEdDurations": "","MOSObjSlugs": "M: Været\nVARET-KYST-020518-TE\n82 ticker meteorolog 1:  2:","MOSSlugs": "STK 2;STK-5\nVÆRET;VÆRPLAKAT-KYST-2\n82 ticker meteorolog 1:  2:","MOSTimes": "20180502T131049Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Bildebeskrivelse": "","Innslagstittel": "Været","Kilde": "TV","mosartType": "STK","ReadTime": 0,"Rettigheter": "Grønt","Rettighetseier": "NRK","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"objID": "N20248_1517834844","mosID": "METADATA.NRK.MOS","mosAbstract": "M: Været (05-02-18 13:47)","objSlug": "M: Været","mosExternalMetadata": {"mosScope": "PLAYLIST","mosSchema": "http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload": {"nrk": {"changetime": "2018-02-05T13:47:23 +01:00","changedBy": "N20248","type": "video","mdSource": "omnibus","title": "Været","description": {},"hbbtv": {"link": ""},"rights": {"notes": "","owner": "NRK","_t": "Green"}}}},"itemSlug": "STK 2;STK-5"}},{"Type": "storyItem","Content": {"itemID": 2,"itemSlug": "VÆRET;VÆRPLAKAT-KYST-2","objID": "\\\\NDTE\\Omn\\C\\S\\24\\65","mosID": "OMNIBUS.NDTE.MOS","abstract": "VARET-KYST-020518-TE NYHETER 00:00:28:07","objDur": 1414,"objTB": 50,"objSlug": "VARET-KYST-020518-TE","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"itemID": 5,"itemSlug": "82 ticker meteorolog 1:  2:","itemChannel": "CG1","mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:00:00 | @M=Auto Timed | 82 ticker meteorolog | 1: | 2: | 3: | 4: | 00:00:00:00","mosObj": {"objID": "NYHETER\\00053302?version=1","objSlug": "82 ticker meteorolog 1:  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/53000/Objects_NYHETER_00053302_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}}}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:46.177Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;1CFBCFBF-4713-461E-97AE2A3354FFBB2C","Slug": "VÆRET;VÆRPLAKAT-FJELLET","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T150733Z","MOSAbstracts": "VARET-FJELL-020518-TE NYHETER 00:00:26:22","MOSItemDurations": "26,88","MOSObjSlugs": "VARET-FJELL-020518-TE","MOSSlugs": "VÆRET;VÆRPLAKAT-FJELLET-2","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Kilde": "TV","mosartTransition": "mix 12","mosartType": "STK","OpprLand": "Norge","ReadTime": 0,"Rettigheter": "Grønt","Team": "(Kun for STK:) Foto: / Redigering:","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 2,"itemSlug": "VÆRET;VÆRPLAKAT-FJELLET-2","objID": "\\\\NDTE\\Omn\\C\\S\\24\\66","mosID": "OMNIBUS.NDTE.MOS","abstract": "VARET-FJELL-020518-TE NYHETER 00:00:26:22","objDur": 1344,"objTB": 50,"objSlug": "VARET-FJELL-020518-TE","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:46.375Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;A3D511ED-8C88-46AF-9CB9BA67630A5591","Slug": "KOMMER 2055;tekst","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","Estimated": 15,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163826Z","MOSAbstracts": "TIDSMARKØR IKKE RØR","MOSObjSlugs": "Story status","MOSSlugs": "SAK 1;intro-3","Owner": "LINUXENPS","Printed": "20180502T164204Z","SourceMediaTime": 0,"SourceTextTime": 0,"StoryLogPreview": "Om drøye fire månader åpner dobbelsporet, som skal gje 22 minutter kortere togtid mellom Larvik og Porsgrunn. Me har vore med på testuren. Meir om det i  kåns neste sending.(*) Det var alt me hadde i denne omgang. Me er tilbake klokka 20:55. Takk for nå.","TextTime": 17,"SystemApprovedBy": "N12914","mosartType": "","ReadTime": 17,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:46.579Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;5C9D3E10-35DC-4DC5-84A799BA882F7389","Slug": "KOMMER 2055;HEAD-TOG","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T163127Z","MOSAbstracts": "METADATA\n HEAD-TOG NYHETER 00:00:24:16 \n_00:00:00:00 | @M=Auto Storyend | 09 teaser | 1:Se sendingen kl. 20.55 | 2: | 3: | 4: | 00:00:00:00","MOSItemDurations": "24,64\n0","MOSItemEdDurations": "","MOSObjSlugs": "M: \nHEAD-TOG\n09 teaser 1:Se sendingen kl. 20.55  2:","MOSSlugs": "STK 2;STK-5\nKOMMER 2055;STK-2\n09 teaser 1:Se sendingen kl. 20.55  2:","MOSTimes": "","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"StoryProducer": "DKTE","TextTime": 0,"SystemApprovedBy": "N12914","Kilde": "TV","mosartTransition": "","mosartType": "STK","OpprLand": "Norge","ReadTime": 0,"Rettigheter": "Grønt","Team": "(Kun for STK:) Foto: / Redigering:","ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"itemID": 4,"objID": "N11580_1412594672","mosID": "METADATA.NRK.MOS","mosAbstract": "METADATA","objSlug": "M:","mosExternalMetadata": {"mosScope": "PLAYLIST","mosSchema": "http://mosA4.com/mos/supported_schemas/MOSAXML2.08","mosPayload": {"nrk": {"type": "video","changedBy": "N11580","changetime": "2014-10-06T13:24:32 +02:00","title": {},"description": {},"hbbtv": {"link": ""},"rights": {"notes": "","owner": "NRK","_t": "Green"}}}},"itemSlug": "STK 2;STK-5"}},{"Type": "storyItem","Content": {"itemID": 2,"itemSlug": "KOMMER 2055;STK-2","objID": "\\\\NDTE\\Omn\\C\\S\\25\\15","mosID": "OMNIBUS.NDTE.MOS","abstract": "HEAD-TOG NYHETER 00:00:24:16","objDur": 1232,"objTB": 50,"objSlug": "HEAD-TOG","mosExternalMetadata": {"mosSchema": "OMNIBUS"}}},{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": {},"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058479_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "09 teaser 1:Se sendingen kl. 20.55  2:","mosObj": {"objID": "NYHETER\\00058479?version=1","objSlug": "09 teaser 1:Se sendingen kl. 20.55  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058479_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 6}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:46.779Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;D7850305-1C4D-4D14-91FCE6327C3C0825","Slug": "TAKK FOR I KVELD;Takk for i kveld","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","ElapsedTime": 7,"MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T154537Z","MOSAbstracts": "_00:00:00:01 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": 0,"MOSItemEdDurations": "","MOSObjSlugs": "50 logo 1:  2:\nStory status","MOSSlugs": "TAKK FOR IKVELD + BILDEKOLLAGE;Takk for ikveld-20\nTAKK FOR IKVELD + BILDEKOLLAGE;seerbilder-18","MOSTimes": "20180502T131049Z\n20180502T165829637Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"TextTime": 0,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": "TAKK2","ReadTime": 0,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": "_00:00:00:01 | @M=Auto Openend | 50 logo | 1: | 2: | 3: | 4: | 00:00:00:00","objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010009_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "TAKK FOR IKVELD + BILDEKOLLAGE;Takk for ikveld-20","mosObj": {"objID": "NYHETER\\00010009?version=1","objSlug": "50 logo 1:  2:","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/10000/Objects_NYHETER_00010009_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 3}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 4,"itemSlug": "TAKK FOR IKVELD + BILDEKOLLAGE;seerbilder-18"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:46.985Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;0C1BCAED-D3C2-4671-B8E96F79860C6308","Slug": "TAKK FOR I KVELD;SLUTTPLAKAT start 18:58:50","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Actual": 10,"Approved": 1,"Creator": "LINUXENPS","MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T132212Z","MOSAbstracts": "_00:00:00:00 | @M=Auto Openend | 67 sluttkredit kort | 1:Redaktør | 2:Stig Bolme | 3:Produsent | 4:Berit Heggholmen | 00:00:00:00\nTIDSMARKØR IKKE RØR","MOSItemDurations": 0,"MOSItemEdDurations": "","MOSObjSlugs": "67 sluttkredit kort 1:Redaktør  2:Stig Bolme\nStory status","MOSSlugs": "67 sluttkredit kort 1:Redaktør  2:Stig Bolme\nTAKK FOR I KVELD;KAM-3","MOSTimes": "20180502T165829644Z","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"TextTime": 0,"SystemApprovedBy": "N12914","mosartType": "KAM","mosartVariant": "SLUTTR3","ReadTime": 0,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "chyron.techycami02.ndte.nrk.mos","abstract": {},"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058432_v1_big.jpg"},"objMetadataPath": {}},"itemChannel": "CG1","itemSlug": "67 sluttkredit kort 1:Redaktør  2:Stig Bolme","mosObj": {"objID": "NYHETER\\00058432?version=1","objSlug": "67 sluttkredit kort 1:Redaktør  2:Stig Bolme","mosItemEditorProgID": "Chymox.AssetBrowser.1","objDur": 0,"objTB": 0,"objPaths": {"objProxyPath": {"techDescription": "JPEG Thumbnail","_t": "http://160.68.33.159/thumbs/NYHETER/58000/Objects_NYHETER_00058432_v1_big.jpg"},"objMetadataPath": {}},"mosExternalMetadata": {"mosSchema": "http://ncsA4.com/mos/supported_schemas/NCSAXML2.08"}},"itemID": 5}},{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 4,"itemSlug": "TAKK FOR I KVELD;KAM-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:47.190Z"})
		// // @ts-ignore
		// Meteor.call(PeripheralDeviceAPI.methods.mosRoFullStory, id, token, {"ID": "MAENPSTEST14;P_SERVER14\\W\\R_07C8C71B-1835-493D-94E1678FD1425B71;EF1A29D9-EF4C-4965-893A4910B2212E66","Slug": "AVSLUTT;Slutt 18.59.00","MosExternalMetaData": [{"MosScope": "PLAYLIST","MosSchema": "http://MAENPSTEST14:10505/schema/enps.dtd","MosPayload": {"Approved": 1,"Creator": "LINUXENPS","MediaTime": 0,"ModBy": "N12914","ModTime": "20180502T132213Z","MOSAbstracts": "TIDSMARKØR IKKE RØR","MOSObjSlugs": "Story status","MOSSlugs": "SAK 1;intro-3","Owner": "LINUXENPS","SourceMediaTime": 0,"SourceTextTime": 0,"TextTime": 0,"SystemApprovedBy": "N12914","mosartType": "BREAK","ReadTime": 0,"ENPSItemType": 3}}],"RunningOrderId": "MAENPSTEST14;P_SERVER14\\W;07C8C71B-1835-493D-94E1678FD1425B71","Body": [{"Type": "storyItem","Content": {"mosID": "mosart.morten.mos","abstract": "TIDSMARKØR IKKE RØR","objID": "STORYSTATUS","objSlug": "Story status","itemID": 2,"itemSlug": "SAK 1;intro-3"}}],"level": "debug","message": "mosRoFullStory","timestamp": "2018-05-09T10:26:47.387Z"})
	}
})

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Note: The data below is copied straight from the test data in mos-connection
let xmlApiData = {
	'roCreate':  literal<IMOSRunningOrder>({
		ID: new MosString128('96857485'),
		Slug: new MosString128('5PM RUNDOWN'),
		// DefaultChannel?: MosString128,
		EditorialStart: new MosTime('2009-04-17T17:02:00'),
		EditorialDuration: new MosDuration('00:58:25'), // @todo: change this into a real Duration
		// Trigger?: any // TODO: Johan frågar vad denna gör,
		// MacroIn?: MosString128,
		// MacroOut?: MosString128,
		// MosExternalMetaData?: Array<IMOSExternalMetaData>,
		Stories: [
			literal<IMOSROStory>({
				ID: new MosString128('5983A501:0049B924:8390EF2B'),
				Slug: new MosString128('COLSTAT MURDER'),
				Number: new MosString128('A5'),
				// MosExternalMetaData: Array<IMOSExternalMetaData>
				Items: [
					literal<IMOSItem>({
						ID: new MosString128('0'),
						Slug: new MosString128('OLSTAT MURDER:VO'),
						ObjectID: new MosString128('M000224'),
						MOSID: 'testmos.enps.com',
						// mosAbstract?: '',
						Paths: [
							literal<IMOSObjectPath>({Type: IMOSObjectPathType.PATH, Description: 'MPEG2 Video', Target: '\\server\media\clip392028cd2320s0d.mxf'}),
							literal<IMOSObjectPath>({Type: IMOSObjectPathType.PROXY_PATH, Description: 'WM9 750Kbps', Target: 'http://server/proxy/clipe.wmv'}),
							literal<IMOSObjectPath>({Type: IMOSObjectPathType.METADATA_PATH, Description: 'MOS Object', Target: 'http://server/proxy/clipe.xml'})
						],
						// Channel?: new MosString128(),
						// EditorialStart?: MosTime
						EditorialDuration: 645,
						UserTimingDuration: 310,
						Trigger: 'CHAINED' // TODO: Johan frågar
						// MacroIn?: new MosString128(),
						// MacroOut?: new MosString128(),
						// MosExternalMetaData?: Array<IMOSExternalMetaData>
					})
				]
			}),
			literal<IMOSROStory>({
				ID: new MosString128('3854737F:0003A34D:983A0B28'),
				Slug: new MosString128('AIRLINE INSPECTIONS'),
				Number: new MosString128('A6'),
				// MosExternalMetaData: Array<IMOSExternalMetaData>
				Items: [
					literal<IMOSItem>({
						ID: new MosString128('0'),
						// Slug: new MosString128(''),
						ObjectID: new MosString128('M000133'),
						MOSID: 'testmos.enps.com',
						// mosAbstract?: '',
						// Channel?: new MosString128(),
						EditorialStart: 55,
						EditorialDuration: 310,
						UserTimingDuration: 200
						// Trigger: 'CHAINED' // TODO: Johan frågar
						// MacroIn?: new MosString128(),
						// MacroOut?: new MosString128(),
						// MosExternalMetaData?: Array<IMOSExternalMetaData>
					})
				]
			})
		]
	}),
	'roReplace':  literal<IMOSRunningOrder>({
		ID: new MosString128('96857485'),
		Slug: new MosString128('5PM RUNDOWN'),
		// DefaultChannel?: MosString128,
		// EditorialStart: new MosTime('2009-04-17T17:02:00'),
		// EditorialDuration: '00:58:25', // @todo: change this into a real Duration
		// Trigger?: any // TODO: Johan frågar vad denna gör,
		// MacroIn?: MosString128,
		// MacroOut?: MosString128,
		// MosExternalMetaData?: Array<IMOSExternalMetaData>,
		Stories: [
			literal<IMOSROStory>({
				ID: new MosString128('5983A501:0049B924:8390EF2B'),
				Slug: new MosString128('COLSTAT MURDER'),
				Number: new MosString128('A1'),
				// MosExternalMetaData: Array<IMOSExternalMetaData>
				Items: [
					literal<IMOSItem>({
						ID: new MosString128('0'),
						Slug: new MosString128('OLSTAT MURDER:VO'),
						ObjectID: new MosString128('M000224'),
						MOSID: 'testmos.enps.com',
						// mosAbstract?: '',
						Paths: [
							literal<IMOSObjectPath>({Type: IMOSObjectPathType.PATH, Description: 'MPEG2 Video', Target: '\\server\media\clip392028cd2320s0d.mxf'}),
							literal<IMOSObjectPath>({Type: IMOSObjectPathType.PROXY_PATH, Description: 'WM9 750Kbps', Target: 'http://server/proxy/clipe.wmv'}),
							literal<IMOSObjectPath>({Type: IMOSObjectPathType.METADATA_PATH, Description: 'MOS Object', Target: 'http://server/proxy/clipe.xml'})
						],
						// Channel?: new MosString128(),
						// EditorialStart?: MosTime
						EditorialDuration: 645,
						UserTimingDuration: 310,
						Trigger: 'CHAINED' // TODO: Johan frågar
						// MacroIn?: new MosString128(),
						// MacroOut?: new MosString128(),
						// MosExternalMetaData?: Array<IMOSExternalMetaData>
					})
				]
			}),
			literal<IMOSROStory>({
				ID: new MosString128('3852737F:0013A64D:923A0B28'),
				Slug: new MosString128('AIRLINE SAFETY'),
				Number: new MosString128('A2'),
				// MosExternalMetaData: Array<IMOSExternalMetaData>
				Items: [
					literal<IMOSItem>({
						ID: new MosString128('0'),
						// Slug: new MosString128(''),
						ObjectID: new MosString128('M000295'),
						MOSID: 'testmos.enps.com',
						// mosAbstract?: '',
						// Channel?: new MosString128(),
						EditorialStart: 500,
						EditorialDuration: 600,
						UserTimingDuration: 310
						// Trigger: 'CHAINED' // TODO: Johan frågar
						// MacroIn?: new MosString128(),
						// MacroOut?: new MosString128(),
						// MosExternalMetaData?: Array<IMOSExternalMetaData>
					})
				]
			})
		]
	}),
	'roDelete':  49478285,
	'roList':  literal<IMOSObject>({
		ID: new MosString128('M000123'),
		Slug: new MosString128('Hotel Fire'),
		// MosAbstract: string,
		Group: 'Show 7',
		Type: IMOSObjectType.VIDEO,
		TimeBase: 59.94,
		Revision: 1,
		Duration: 1800,
		Status: IMOSObjectStatus.NEW,
		AirStatus: IMOSObjectAirStatus.READY,
		Paths: [
			{Type: IMOSObjectPathType.PATH, Description: 'MPEG2 Video', Target: '\\server\media\clip392028cd2320s0d.mxf'},
			{Type: IMOSObjectPathType.PROXY_PATH, Description: 'WM9 750Kbps', Target: 'http://server/proxy/clipe.wmv'},
			{Type: IMOSObjectPathType.METADATA_PATH, Description: 'MOS Object', Target: 'http://server/proxy/clipe.xml'}
		],
		CreatedBy: new MosString128('Chris'),
		Created: new MosTime('2009-10-31T23:39:12'),
		ChangedBy: new MosString128('Chris'),
		Changed: new MosTime('2009-10-31T23:39:12')
		// Description: string
		// mosExternalMetaData?: Array<IMOSExternalMetaData>
	}),
	'roMetadataReplace':  literal<IMOSRunningOrderBase>({
		ID: new MosString128('96857485'),
		Slug: new MosString128('5PM RUNDOWN'),
		// DefaultChannel?: new MosString128(''),
		EditorialStart: new MosTime('2009-04-17T17:02:00'),
		EditorialDuration: new MosDuration('00:58:25')
		// Trigger?: any // TODO: Johan frågar vad denna gör
		// MacroIn?: new MosString128(''),
		// MacroOut?: new MosString128(''),
		// MosExternalMetaData?: Array<IMOSExternalMetaData>
	}),
	'roElementStat_ro':  literal<IMOSRunningOrderStatus>({
		ID: new MosString128('5PM'),
		Status: IMOSObjectStatus.MANUAL_CTRL,
		Time: new MosTime('2009-04-11T14:13:53')
	}),
	'roElementStat_story':  literal<IMOSStoryStatus>({
		RunningOrderId: new MosString128('5PM'),
		ID: new MosString128('HOTEL FIRE'),
		Status: IMOSObjectStatus.PLAY,
		Time: new MosTime('1999-04-11T14:13:53')
	}),
	'roElementStat_item':  literal<IMOSItemStatus>({
		RunningOrderId: new MosString128('5PM'),
		StoryId: new MosString128('HOTEL FIRE '),
		ID: new MosString128('0'),
		ObjectId: new MosString128('A0295'),
		Channel: new MosString128('B'),
		Status: IMOSObjectStatus.PLAY,
		Time: new MosTime('2009-04-11T14:13:53')
	}),
	'roReadyToAir':  literal<IMOSROReadyToAir>({
		ID: new MosString128('5PM'),
		Status: IMOSObjectAirStatus.READY
	}),
	'roElementAction_insert_story_Action':  literal<IMOSStoryAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2')
	}),
	'roElementAction_insert_story_Stories':  [
		literal<IMOSROStory>({
			ID: new MosString128('17'),
			Slug: new MosString128('Barcelona Football'),
			Number: new MosString128('A2'),
			// MosExternalMetaData?: Array<IMOSExternalMetaData>,
			Items: [
				literal<IMOSItem>({
					ID: new MosString128('27'),
					// Slug?: new MosString128(''),
					ObjectID: new MosString128('M73627'),
					MOSID: 'testmos',
					// mosAbstract?: '',
					Paths: [
						{Type: IMOSObjectPathType.PATH, Description: 'MPEG2 Video', Target: '\\server\media\clip392028cd2320s0d.mxf'},
						{Type: IMOSObjectPathType.PROXY_PATH, Description: 'WM9 750Kbps', Target: 'http://server/proxy/clipe.wmv'},
						{Type: IMOSObjectPathType.METADATA_PATH, Description: 'MOS Object', Target: 'http://server/proxy/clipe.xml'}
					],
					EditorialStart: 0,
					EditorialDuration: 715,
					UserTimingDuration: 415
				}),
				literal<IMOSItem>({
					ID: new MosString128('28'),
					ObjectID: new MosString128('M73628'),
					MOSID: 'testmos',
					// mosAbstract?: '',
					EditorialStart: 0,
					EditorialDuration: 315
				})
			]
		})
	],
	'roElementAction_insert_item_Action':  literal<IMOSItemAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2'),
		ItemID: new MosString128('23')
	}),
	'roElementAction_insert_item_Items':  [
		literal<IMOSItem>({
			ID: new MosString128('27'),
			Slug: new MosString128('NHL PKG'),
			ObjectID: new MosString128('M19873'),
			MOSID: 'testmos',
			Paths: [
				{Type: IMOSObjectPathType.PATH, Description: 'MPEG2 Video', Target: '\\server\media\clip392028cd2320s0d.mxf'},
				{Type: IMOSObjectPathType.PROXY_PATH, Description: 'WM9 750Kbps', Target: 'http://server/proxy/clipe.wmv'},
				{Type: IMOSObjectPathType.METADATA_PATH, Description: 'MOS Object', Target: 'http://server/proxy/clipe.xml'}
			],
			EditorialStart: 0,
			EditorialDuration: 700,
			UserTimingDuration: 690
		})
	],
	'roElementAction_replace_story_Action':  literal<IMOSStoryAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2')
	}),
	'roElementAction_replace_story_Stories':  [
		literal<IMOSROStory>({
			ID: new MosString128('17'),
			Slug: new MosString128('Porto Football'),
			Number: new MosString128('A2'),
			// MosExternalMetaData?: Array<IMOSExternalMetaData>,
			Items: [
				literal<IMOSItem>({
					ID: new MosString128('27'),
					// Slug?: new MosString128(''),
					ObjectID: new MosString128('M73627'),
					MOSID: 'testmos',
					// mosAbstract?: '',
					Paths: [
						{Type: IMOSObjectPathType.PATH, Description: 'MPEG2 Video', Target: '\\server\media\clip392028cd2320s0d.mxf'},
						{Type: IMOSObjectPathType.PROXY_PATH, Description: 'WM9 750Kbps', Target: 'http://server/proxy/clipe.wmv'},
						{Type: IMOSObjectPathType.METADATA_PATH, Description: 'MOS Object', Target: 'http://server/proxy/clipe.xml'}
					],
					EditorialStart: 0,
					EditorialDuration: 715,
					UserTimingDuration: 415
				}),
				literal<IMOSItem>({
					ID: new MosString128('28'),
					ObjectID: new MosString128('M73628'),
					MOSID: 'testmos',
					// mosAbstract?: '',
					EditorialStart: 0,
					EditorialDuration: 315
				})
			]
		})
	],
	'roElementAction_replace_item_Action':  literal<IMOSItemAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2'),
		ItemID: new MosString128('23')
	}),
	'roElementAction_replace_item_Items':  [
		literal<IMOSItem>({
			ID: new MosString128('27'),
			Slug: new MosString128('NHL PKG'),
			ObjectID: new MosString128('M19873'),
			MOSID: 'testmos',
			Paths: [
				{Type: IMOSObjectPathType.PATH, Description: 'MPEG2 Video', Target: '\\server\media\clip392028cd2320s0d.mxf'},
				{Type: IMOSObjectPathType.PROXY_PATH, Description: 'WM9 750Kbps', Target: 'http://server/proxy/clipe.wmv'},
				{Type: IMOSObjectPathType.METADATA_PATH, Description: 'MOS Object', Target: 'http://server/proxy/clipe.xml'}
			],
			EditorialStart: 0,
			EditorialDuration: 700,
			UserTimingDuration: 690
		})
	],
	'roElementAction_move_story_Action':  literal<IMOSStoryAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2')
	}),
	'roElementAction_move_story_Stories':  [
		new MosString128('7')
	],
	'roElementAction_move_stories_Action':  literal<IMOSStoryAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2')
	}),
	'roElementAction_move_stories_Stories':  [
		new MosString128('7'),
		new MosString128('12')
	],
	'roElementAction_move_items_Action':  literal<IMOSItemAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2'),
		ItemID: new MosString128('12')
	}),
	'roElementAction_move_items_Items':  [
		new MosString128('23'),
		new MosString128('24')
	],
	'roElementAction_delete_story_Action':  literal<IMOSROAction>({
		RunningOrderID: new MosString128('5PM')
	}),
	'roElementAction_delete_story_Stories':  [
		new MosString128('3')
	],
	'roElementAction_delete_items_Action':  literal<IMOSStoryAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2')
	}),
	'roElementAction_delete_items_Items':  [
		new MosString128('23'),
		new MosString128('24')
	],
	'roElementAction_swap_stories_Action':  literal<IMOSROAction>({
		RunningOrderID: new MosString128('5PM')
	}),
	'roElementAction_swap_stories_StoryId0':  new MosString128('3'),
	'roElementAction_swap_stories_StoryId1':  new MosString128('5'),
	'roElementAction_swap_items_Action':  literal<IMOSStoryAction>({
		RunningOrderID: new MosString128('5PM'),
		StoryID: new MosString128('2')
	}),
	'roElementAction_swap_items_ItemId0':  new MosString128('23'),
	'roElementAction_swap_items_ItemId1':  new MosString128('24')
}

export { xmlApiData }
