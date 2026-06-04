from app.services.embeddings_bge import embeddings


def test_bge_embedding_shape_and_norm():
    vector = embeddings.embed("grid infrastructure connection expert")
    assert len(vector) == 384
    assert abs(sum(value * value for value in vector) - 1.0) < 0.01
