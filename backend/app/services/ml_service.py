class MLService:
    def predict(self, ct_filepath: str, age: float, sex: str, scanner: str):
        """
        PLACEHOLDER - swap internals with real model loading + inference once ready.
        Everything downstream depends only on this return shape.
        """
        return {
            "prediction": 0.5,
            "gradcam_path": None,
            "referral_pathway_hint": None,  # later: model could suggest based on prediction confidence
        }

ml_service = MLService()