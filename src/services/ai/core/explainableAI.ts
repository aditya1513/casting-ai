import * as tf from '@tensorflow/tfjs-node';
import { AIConfig } from './config';
import { 
  ExplainableAIResult,
  FeatureImportance,
  AlternativeOutcome 
} from '../types';

export class ExplainableAIService {
  constructor() {
  }

  async explainPrediction(
    model: tf.LayersModel,
    input: number[],
    features: string[],
    modelType: 'classification' | 'regression' = 'classification'
  ): Promise<ExplainableAIResult> {
    const startTime = Date.now();
    
    const prediction = await this.makePrediction(model, input, modelType);
    const featureImportance = await this.calculateFeatureImportance(model, input, features, modelType);
    const reasoning = this.generateReasoning(featureImportance, prediction, modelType);
    const alternatives = await this.generateAlternatives(model, input, features, modelType);
    
    return {
      prediction,
      confidence: this.calculateConfidence(prediction, modelType),
      explanation: {
        features: featureImportance,
        reasoning,
        alternativeOutcomes: alternatives,
      },
      metadata: {
        modelVersion: '1.0.0',
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
      },
    };
  }

  private async makePrediction(
    model: tf.LayersModel,
    input: number[],
    modelType: 'classification' | 'regression'
  ): Promise<any> {
    const inputTensor = tf.tensor2d([input]);
    const outputTensor = model.predict(inputTensor) as tf.Tensor;
    const output = await outputTensor.data();
    
    inputTensor.dispose();
    outputTensor.dispose();
    
    if (modelType === 'classification') {
      const probabilities = Array.from(output);
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      return {
        class: maxIndex,
        probabilities,
        confidence: Math.max(...probabilities),
      };
    } else {
      return {
        value: output[0],
        confidence: this.calculateRegressionConfidence(output[0]),
      };
    }
  }

  private calculateConfidence(prediction: any, modelType: string): number {
    if (modelType === 'classification') {
      return prediction.confidence || 0;
    } else {
      return prediction.confidence || 0.5;
    }
  }

  private calculateRegressionConfidence(value: number): number {
    return Math.min(Math.max(0.1, 1 - Math.abs(value) / 10), 0.99);
  }

  async calculateFeatureImportance(
    model: tf.LayersModel,
    input: number[],
    featureNames: string[],
    modelType: 'classification' | 'regression'
  ): Promise<FeatureImportance[]> {
    if (AIConfig.explainability.method === 'shap') {
      return await this.calculateSHAPValues(model, input, featureNames, modelType);
    } else if (AIConfig.explainability.method === 'lime') {
      return await this.calculateLIMEValues(model, input, featureNames, modelType);
    } else {
      return await this.calculatePermutationImportance(model, input, featureNames, modelType);
    }
  }

  private async calculateSHAPValues(
    model: tf.LayersModel,
    input: number[],
    featureNames: string[],
    modelType: 'classification' | 'regression'
  ): Promise<FeatureImportance[]> {
    const baseline = new Array(input.length).fill(0);
    const originalPrediction = await this.makePrediction(model, input, modelType);
    const baselinePrediction = await this.makePrediction(model, baseline, modelType);
    
    const shapValues: FeatureImportance[] = [];
    
    for (let i = 0; i < input.length; i++) {
      const marginalContribution = await this.calculateMarginalContribution(
        model, input, baseline, i, modelType, originalPrediction, baselinePrediction
      );
      
      shapValues.push({
        feature: featureNames[i] || `feature_${i}`,
        importance: Math.abs(marginalContribution),
        contribution: marginalContribution > 0 ? 'positive' : marginalContribution < 0 ? 'negative' : 'neutral',
        value: input[i],
      });
    }
    
    return shapValues.sort((a, b) => b.importance - a.importance);
  }

  private async calculateMarginalContribution(
    model: tf.LayersModel,
    input: number[],
    baseline: number[],
    featureIndex: number,
    modelType: 'classification' | 'regression',
    originalPrediction: any,
    baselinePrediction: any
  ): Promise<number> {
    const numSamples = 100;
    let totalContribution = 0;
    
    for (let sample = 0; sample < numSamples; sample++) {
      const randomSubset = this.generateRandomSubset(input.length, featureIndex);
      
      const withFeature = [...baseline];
      const withoutFeature = [...baseline];
      
      randomSubset.forEach(idx => {
        withFeature[idx] = input[idx];
        withoutFeature[idx] = input[idx];
      });
      
      withFeature[featureIndex] = input[featureIndex];
      
      const predWith = await this.makePrediction(model, withFeature, modelType);
      const predWithout = await this.makePrediction(model, withoutFeature, modelType);
      
      const contribution = this.getPredictionDifference(predWith, predWithout, modelType);
      totalContribution += contribution;
    }
    
    return totalContribution / numSamples;
  }

  private generateRandomSubset(totalFeatures: number, excludeIndex: number): number[] {
    const subset: number[] = [];
    for (let i = 0; i < totalFeatures; i++) {
      if (i !== excludeIndex && Math.random() < 0.5) {
        subset.push(i);
      }
    }
    return subset;
  }

  private getPredictionDifference(pred1: any, pred2: any, modelType: string): number {
    if (modelType === 'classification') {
      return pred1.confidence - pred2.confidence;
    } else {
      return pred1.value - pred2.value;
    }
  }

  private async calculateLIMEValues(
    model: tf.LayersModel,
    input: number[],
    featureNames: string[],
    modelType: 'classification' | 'regression'
  ): Promise<FeatureImportance[]> {
    const numSamples = 1000;
    const samples: number[][] = [];
    const predictions: number[] = [];
    
    for (let i = 0; i < numSamples; i++) {
      const perturbedInput = this.perturbInput(input);
      samples.push(perturbedInput);
      
      const prediction = await this.makePrediction(model, perturbedInput, modelType);
      predictions.push(modelType === 'classification' ? prediction.confidence : prediction.value);
    }
    
    const weights = this.fitLinearModel(samples, predictions, input);
    
    return weights.map((weight, index) => ({
      feature: featureNames[index] || `feature_${index}`,
      importance: Math.abs(weight),
      contribution: weight > 0 ? 'positive' : weight < 0 ? 'negative' : 'neutral',
      value: input[index],
    })).sort((a, b) => b.importance - a.importance);
  }

  private perturbInput(input: number[]): number[] {
    return input.map(value => {
      const noise = (Math.random() - 0.5) * 0.2;
      return Math.max(0, Math.min(1, value + noise));
    });
  }

  private fitLinearModel(samples: number[][], predictions: number[], reference: number[]): number[] {
    const weights = this.calculateWeights(samples, reference);
    const X = samples.map((sample, i) => [...sample, 1].map(val => val * weights[i]));
    const y = predictions.map((pred, i) => pred * weights[i]);
    
    return this.solveLinearSystem(X, y);
  }

  private calculateWeights(samples: number[][], reference: number[]): number[] {
    const kernelWidth = 0.75;
    
    return samples.map(sample => {
      const distance = this.euclideanDistance(sample, reference);
      return Math.exp(-distance / kernelWidth);
    });
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  private solveLinearSystem(X: number[][], y: number[]): number[] {
    const numFeatures = X[0].length - 1;
    const weights = new Array(numFeatures).fill(0);
    
    const XTX = this.matrixMultiply(this.transpose(X), X);
    const XTy = this.matrixVectorMultiply(this.transpose(X), y);
    
    return this.solveSystem(XTX, XTy);
  }

  private matrixMultiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        result[i][j] = 0;
        for (let k = 0; k < A[i].length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  private matrixVectorMultiply(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
  }

  private transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }

  private solveSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);
    
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    const solution = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      solution[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }
    
    return solution;
  }

  private async calculatePermutationImportance(
    model: tf.LayersModel,
    input: number[],
    featureNames: string[],
    modelType: 'classification' | 'regression'
  ): Promise<FeatureImportance[]> {
    const originalPrediction = await this.makePrediction(model, input, modelType);
    const baselineScore = modelType === 'classification' 
      ? originalPrediction.confidence 
      : originalPrediction.value;
    
    const importances: FeatureImportance[] = [];
    
    for (let i = 0; i < input.length; i++) {
      const perturbedInput = [...input];
      perturbedInput[i] = Math.random();
      
      const perturbedPrediction = await this.makePrediction(model, perturbedInput, modelType);
      const perturbedScore = modelType === 'classification'
        ? perturbedPrediction.confidence
        : perturbedPrediction.value;
      
      const importance = Math.abs(baselineScore - perturbedScore);
      
      importances.push({
        feature: featureNames[i] || `feature_${i}`,
        importance,
        contribution: baselineScore > perturbedScore ? 'positive' : 'negative',
        value: input[i],
      });
    }
    
    return importances.sort((a, b) => b.importance - a.importance);
  }

  private generateReasoning(
    featureImportance: FeatureImportance[],
    prediction: any,
    modelType: string
  ): string {
    const topFeatures = featureImportance.slice(0, Math.min(5, AIConfig.explainability.maxFeatures));
    
    let reasoning = `This ${modelType} prediction `;
    
    if (modelType === 'classification') {
      reasoning += `classified the input with ${(prediction.confidence * 100).toFixed(1)}% confidence. `;
    } else {
      reasoning += `estimated a value of ${prediction.value.toFixed(2)}. `;
    }
    
    if (topFeatures.length > 0) {
      reasoning += 'The most influential factors were: ';
      
      const positiveFeatures = topFeatures.filter(f => f.contribution === 'positive');
      const negativeFeatures = topFeatures.filter(f => f.contribution === 'negative');
      
      if (positiveFeatures.length > 0) {
        reasoning += positiveFeatures.map(f => `${f.feature} (${f.value.toFixed(3)})`).join(', ');
        reasoning += ' had a positive impact';
        
        if (negativeFeatures.length > 0) {
          reasoning += ', while ';
        }
      }
      
      if (negativeFeatures.length > 0) {
        reasoning += negativeFeatures.map(f => `${f.feature} (${f.value.toFixed(3)})`).join(', ');
        reasoning += ' had a negative impact';
      }
      
      reasoning += ' on the prediction.';
    }
    
    return reasoning;
  }

  private async generateAlternatives(
    model: tf.LayersModel,
    input: number[],
    featureNames: string[],
    modelType: 'classification' | 'regression'
  ): Promise<AlternativeOutcome[]> {
    if (!AIConfig.explainability.includeAlternatives) {
      return [];
    }
    
    const alternatives: AlternativeOutcome[] = [];
    const originalPrediction = await this.makePrediction(model, input, modelType);
    
    const importantFeatures = await this.calculateFeatureImportance(model, input, featureNames, modelType);
    const topFeatures = importantFeatures.slice(0, 3);
    
    for (const feature of topFeatures) {
      const featureIndex = featureNames.indexOf(feature.feature);
      if (featureIndex === -1) continue;
      
      const modifiedInput = [...input];
      
      if (feature.contribution === 'positive') {
        modifiedInput[featureIndex] = Math.max(0, feature.value - 0.2);
      } else {
        modifiedInput[featureIndex] = Math.min(1, feature.value + 0.2);
      }
      
      const altPrediction = await this.makePrediction(model, modifiedInput, modelType);
      const probability = modelType === 'classification' 
        ? altPrediction.confidence 
        : Math.max(0, 1 - Math.abs(altPrediction.value - originalPrediction.value));
      
      alternatives.push({
        outcome: modelType === 'classification' ? altPrediction.class : altPrediction.value,
        probability,
        requiredChanges: [`Modify ${feature.feature} from ${feature.value.toFixed(3)} to ${modifiedInput[featureIndex].toFixed(3)}`],
      });
    }
    
    return alternatives.sort((a, b) => b.probability - a.probability);
  }

  async explainModelBehavior(
    model: tf.LayersModel,
    testInputs: number[][],
    featureNames: string[],
    modelType: 'classification' | 'regression' = 'classification'
  ): Promise<any> {
    const globalImportance: Record<string, number> = {};
    const correlations: Record<string, number> = {};
    
    for (const input of testInputs) {
      const importance = await this.calculateFeatureImportance(model, input, featureNames, modelType);
      
      importance.forEach(item => {
        globalImportance[item.feature] = (globalImportance[item.feature] || 0) + item.importance;
      });
    }
    
    Object.keys(globalImportance).forEach(feature => {
      globalImportance[feature] /= testInputs.length;
    });
    
    const modelBehavior = {
      globalFeatureImportance: Object.entries(globalImportance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      featureCorrelations: correlations,
      modelComplexity: this.assessModelComplexity(model),
      interpretabilityScore: this.calculateInterpretabilityScore(globalImportance),
      recommendations: this.generateModelRecommendations(globalImportance, model),
    };
    
    return modelBehavior;
  }

  private assessModelComplexity(model: tf.LayersModel): string {
    const totalParams = model.countParams();
    const numLayers = model.layers.length;
    
    if (totalParams < 1000 && numLayers < 5) {
      return 'low';
    } else if (totalParams < 100000 && numLayers < 10) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private calculateInterpretabilityScore(importance: Record<string, number>): number {
    const values = Object.values(importance);
    if (values.length === 0) return 0;
    
    const maxImportance = Math.max(...values);
    const avgImportance = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const concentration = maxImportance / (avgImportance + 0.001);
    
    return Math.min(1, concentration / 10);
  }

  private generateModelRecommendations(
    importance: Record<string, number>,
    model: tf.LayersModel
  ): string[] {
    const recommendations: string[] = [];
    const complexity = this.assessModelComplexity(model);
    
    if (complexity === 'high') {
      recommendations.push('Consider model simplification for better interpretability');
      recommendations.push('Use regularization techniques to reduce overfitting');
    }
    
    const values = Object.values(importance);
    const lowImportanceFeatures = Object.entries(importance)
      .filter(([, value]) => value < 0.01)
      .length;
    
    if (lowImportanceFeatures > values.length * 0.5) {
      recommendations.push('Consider feature selection to remove low-importance features');
    }
    
    const interpretabilityScore = this.calculateInterpretabilityScore(importance);
    if (interpretabilityScore < 0.3) {
      recommendations.push('Model shows low interpretability - consider using simpler algorithms');
      recommendations.push('Implement additional explainability techniques like SHAP or LIME');
    }
    
    return recommendations;
  }

  async validateExplanations(
    explanations: ExplainableAIResult[],
    testInputs: number[][],
    expectedOutputs: any[]
  ): Promise<any> {
    let consistencyScore = 0;
    let accuracyScore = 0;
    const validationResults: any[] = [];
    
    for (let i = 0; i < explanations.length; i++) {
      const explanation = explanations[i];
      const expected = expectedOutputs[i];
      
      const consistency = this.checkConsistency(explanation);
      const accuracy = this.checkAccuracy(explanation, expected);
      
      consistencyScore += consistency;
      accuracyScore += accuracy;
      
      validationResults.push({
        index: i,
        consistency,
        accuracy,
        topFeatures: explanation.explanation.features.slice(0, 3),
      });
    }
    
    return {
      overallConsistency: consistencyScore / explanations.length,
      overallAccuracy: accuracyScore / explanations.length,
      validationResults,
      recommendations: this.generateValidationRecommendations(
        consistencyScore / explanations.length,
        accuracyScore / explanations.length
      ),
    };
  }

  private checkConsistency(explanation: ExplainableAIResult): number {
    const features = explanation.explanation.features;
    const topFeatures = features.slice(0, 5);
    
    const importanceSum = topFeatures.reduce((sum, f) => sum + f.importance, 0);
    const expectedSum = 1;
    
    return Math.max(0, 1 - Math.abs(importanceSum - expectedSum));
  }

  private checkAccuracy(explanation: ExplainableAIResult, expected: any): number {
    const predicted = explanation.prediction;
    
    if (typeof expected === 'number') {
      const error = Math.abs(predicted.value - expected);
      return Math.max(0, 1 - error);
    } else {
      return predicted.class === expected ? 1 : 0;
    }
  }

  private generateValidationRecommendations(
    consistency: number,
    accuracy: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (consistency < 0.7) {
      recommendations.push('Improve explanation consistency by using more stable feature importance methods');
      recommendations.push('Consider ensemble methods for more robust explanations');
    }
    
    if (accuracy < 0.8) {
      recommendations.push('Review model performance - low accuracy may indicate underlying issues');
      recommendations.push('Validate training data quality and feature engineering');
    }
    
    if (consistency > 0.9 && accuracy > 0.9) {
      recommendations.push('Explanations show high quality - consider deploying to production');
    }
    
    return recommendations;
  }
}