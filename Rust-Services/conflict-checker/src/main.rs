use actix_web::{App, HttpResponse, HttpServer, Responder, post, web};
use serde::{Deserialize};
use mysql_async::{Pool};
use mysql_async::prelude::*;
#[derive(Deserialize)]
struct ConflictRequest {
    room: String,
    time: String,
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

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = Pool::new("mysql://root:lumecraft@localhost:3306/classroom_reservations");


    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(check_conflict) // register route
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}