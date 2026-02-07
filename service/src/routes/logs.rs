use axum::{
    extract::State,
    response::sse::{Event, Sse},
};
use futures::stream::Stream;
use std::{convert::Infallible, sync::Arc, time::Duration};

use crate::{AppState, logger};

pub async fn logs_stream(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // Get historical logs first
    let history = logger::get_history();
    let rx = state.log_tx.subscribe();

    // Create a stream that first yields history, then live logs
    let history_stream = futures::stream::iter(
        history
            .into_iter()
            .map(|msg| Ok(Event::default().data(msg))),
    );

    let live_stream = futures::stream::unfold(rx, |mut rx| async move {
        match rx.recv().await {
            Ok(msg) => Some((Ok(Event::default().data(msg)), rx)),
            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                // If we lagged, just continue receiving
                Some((
                    Ok(Event::default().data("INFO|STREAM|Some logs were skipped due to lag")),
                    rx,
                ))
            }
            Err(tokio::sync::broadcast::error::RecvError::Closed) => None,
        }
    });

    // Chain history and live streams
    let combined = futures::stream::StreamExt::chain(history_stream, live_stream);

    Sse::new(combined).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text(""), // Empty text so it doesn't show as a log entry
    )
}
