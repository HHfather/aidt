/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const admin = require("firebase-admin");
admin.initializeApp();

// 로그인 API
exports.traineeLogin = onRequest(async (request, response) => {
  // CORS 설정
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST");
  response.set("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  if (request.method !== "POST") {
    return response.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const {name, affiliation, region, authKey} = request.body;

  if (!name || !affiliation || !region || !authKey) {
    return response.status(400).json({
      success: false,
      error: "모든 필드를 입력해주세요.",
    });
  }

  try {
    const db = admin.firestore();
    const schedulesCol = db.collection("schedules");
    const schedulesSnapshot = await schedulesCol.get();
    let foundUser = null;

    schedulesSnapshot.forEach((doc) => {
      const data = doc.data();
      Object.values(data).forEach((item) => {
        if (Array.isArray(item)) {
          item.forEach((person) => {
            const dbName = (person.name || "").trim().toLowerCase();
            const dbAff = (person.affiliation || "").trim().toLowerCase();
            const dbRegion = (person.region || "").trim().replace(/[^0-9]/g, "");
            const inputName = name.trim().toLowerCase();
            const inputAff = affiliation.trim().toLowerCase();
            const inputRegion = region.trim().replace(/[^0-9]/g, "");
            const inputKey = authKey.trim();

            if (
              dbName === inputName &&
              dbAff === inputAff &&
              dbRegion === inputRegion &&
              inputKey === "happy"
            ) {
              foundUser = person;
            }
          });
        }
      });
    });

    if (foundUser) {
      return response.status(200).json({
        success: true,
        user: {
          id: `${foundUser.region}_${Date.now()}_${foundUser.name}`,
          name: foundUser.name,
          affiliation: foundUser.affiliation,
          region: foundUser.region,
          team: "기본팀",
          isUser: true,
          currentProject: {
            participantAuthKey: authKey,
            assignments: "",
            createdBy: "admin",
            schedule: [],
            guideAuthKey: "lucky",
            isDeleted: false,
            projectName: `${foundUser.region} 연수`,
            id: `${foundUser.region}_${Date.now()}`,
            region: (foundUser.region && 
                     foundUser.region.replace(/[^0-9]/g, "")) || "1",
            title: `${foundUser.region} 연수`,
            participants: [
              {
                name: foundUser.name,
                region: "",
                affiliation: foundUser.affiliation,
              },
            ],
          },
          loginTime: new Date().toISOString(),
        },
      });
    } else {
      return response.status(401).json({
        success: false,
        error: "입력하신 정보가 연수 참여자 명단과 일치하지 않거나 " +
               "인증키가 올바르지 않습니다.",
      });
    }
  } catch (error) {
    logger.error("Login error:", error);
    return response.status(500).json({success: false, error: "서버 오류"});
  }
});
