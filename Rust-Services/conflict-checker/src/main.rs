use actix_web::{App, HttpResponse, HttpServer, Responder, post, get, web};
use serde::{Deserialize, Serialize};
use mysql_async::{Pool};
use mysql_async::prelude::*;
#[derive(Deserialize)]
struct ConflictRequest {
    room: String,
    time: String,
}

#[derive(Serialize)]
struct Reservation {
    implementation_id: i32,
    course_id: i32,
    is_onlineclass: bool,
    starttime: String,
    endtime: String,
    teacher_id: i32,
    classroom_id: i32,
}


#[post("/check-conflict")]
async fn check_conflict(
    req: web::Json<ConflictRequest>,
    pool: web::Data<Pool>,
) -> impl Responder {
    println!("Checking room={} time={}", req.room, req.time);
    let mut conn = pool.get_conn().await.unwrap();
    
    // Query to check conflicts
    let count: Option<u64> = conn.exec_first(
        "SELECT COUNT(*) FROM reservations WHERE room_name = ? AND time = ?",
        (&req.room, &req.time),
    ).await.unwrap();

    let available = count.unwrap_or(0) == 0;

    if count.unwrap_or(0) > 0 {
        // Already reserved
        return HttpResponse::Ok().json(serde_json::json!({ "available": false }));
    }

    // Insert new reservation
    conn.exec_drop(
        "INSERT INTO reservations (room_name, time) VALUES (?, ?)",
        (&req.room, &req.time),
    ).await.unwrap();

    HttpResponse::Ok().json(serde_json::json!({ "available": available }))

}

#[get("/get-reservations-list")]
async fn get_reservations_list(
    pool: web::Data<Pool>
) -> impl Responder {
    let mut conn = match pool.get_conn().await {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("DB connection error: {:?}", e);
            return HttpResponse::InternalServerError().json(
                serde_json::json!({ "message": "Failed to connect to DB" })
            );
        }
    };

    let query = r#"
        SELECT implementationID, courseID, is_onlineclass, starttime, endtime, teacherID, classroomID
        FROM implementations
    "#;

    let result: Result<Vec<Reservation>, _> = conn
        .query_map(
            query,
            |(implementation_id, course_id, is_onlineclass, starttime, endtime, teacher_id, classroom_id)| {
                Reservation {
                    implementation_id,
                    course_id,
                    is_onlineclass,
                    starttime,
                    endtime,
                    teacher_id,
                    classroom_id,
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