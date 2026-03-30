use actix_web::{App, HttpResponse, HttpServer, Responder, post, get, web};
use serde::{Deserialize, Serialize};
use mysql_async::{Pool};
use mysql_async::prelude::*;
#[derive(Deserialize)]
struct ConflictRequest {
    room: i32,
    start: String,
    end: String,
}


#[derive(Serialize)]
struct Reservation {
    implementation_id: i32,
    course_id: i32,
    course_name: String,
    is_onlineclass: bool,
    starttime: String,
    endtime: String,
    teacher_id_opt: Option<i32>,
    classroom_id: i32,
    classroom_name: String,
}


#[post("/check-conflict")]
async fn check_conflict(
    req: web::Json<ConflictRequest>,
    pool: web::Data<Pool>,
) -> impl Responder {
    println!("check-conflict request");

    let mut conn = pool.get_conn().await.unwrap();
    
    // Query to check conflicts
    let count: Option<u64> = conn.exec_first(
        "SELECT COUNT(*) FROM implementations WHERE classroomID = ? AND starttime = ? AND endtime = ?",
        (&req.room, &req.start, &req.end),
    ).await.unwrap();


    let count = count.unwrap_or(0);

    if count > 0 {
        // Already reserved
        return HttpResponse::Ok().json(serde_json::json!({ "available": false }));
    }

    HttpResponse::Ok().json(serde_json::json!({ "available": true }))
}

#[get("/reservations")]
async fn get_reservations_list(
    pool: web::Data<Pool>
) -> impl Responder {
    eprintln!("Starting get_reservations_list...");

    let mut conn = match pool.get_conn().await {
        Ok(conn) => {
            eprintln!("DB connection established.");
            conn
        },
        Err(e) => {
            eprintln!("DB connection error: {:?}", e);
            return HttpResponse::InternalServerError().json(
                serde_json::json!({ "message": "Failed to connect to DB" })
            );
        }
    };

    let query = r#"
        SELECT 
        r.implementationID,
        r.courseID,
        c.name AS course_name,
        r.is_onlineclass,
        r.starttime,
        r.endtime,
        r.teacherID,
        r.classroomID,
        cl.name AS classroom_name   -- only the classroom name
    FROM implementations r
    JOIN courses c ON r.courseID = c.courseID
    JOIN classrooms cl ON r.classroomID = cl.classroomID
    "#;

    eprintln!("Running query: {}", query);

    let result: Result<Vec<Reservation>, _> = conn
    .query_map(
        query,
        |(
            implementation_id,
            course_id,
            course_name,          // <-- include this
            is_onlineclass_raw,
            starttime,
            endtime,
            teacher_id_opt,
            classroom_id,
            classroom_name,
        ): (i32, i32, String, i32, String, String, Option<i32>, i32, String)| {
            eprintln!(
                    "Mapping row -> impl_id: {}, course_id: {}, course_name: {}, is_onlineclass_raw: {}, start: {}, end: {}, teacher_id: {:?}, classroom_id: {}",
                    implementation_id, course_id, course_name, is_onlineclass_raw, starttime, endtime, teacher_id_opt, classroom_id,
                );
            Reservation {
                implementation_id,
                course_id,
                course_name,
                is_onlineclass: is_onlineclass_raw != 0, // convert tinyint to bool
                starttime,
                endtime,
                teacher_id_opt,
                classroom_id,
                classroom_name
            }
        },
    )
    .await;



    match result {
        Ok(reservations) => HttpResponse::Ok().json(reservations),
        Err(e) => {
            eprintln!("Query error: {:?}", e);
            HttpResponse::InternalServerError().json(
                serde_json::json!({ "message": "Failed to fetch reservations" })
            )
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = Pool::new("mysql://root:lumecraft@localhost:3306/classroom_reservations");


    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(check_conflict) // register route
            .service(get_reservations_list)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}