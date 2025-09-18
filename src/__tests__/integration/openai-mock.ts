/**
 * OpenAI API Mock for Integration Testing
 * Provides realistic mock responses to avoid API costs during testing
 */
import type { 
    OpenAIChatCompletionResponse, 
    OpenAIChatCompletionRequest,
    OpenAIChoice 
} from '../../shared/openai-types.js';

export interface MockedOpenAIResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: OpenAIChoice[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class OpenAIMock {
    private static recipeTemplates = [
        {
            title: "Spaghetti Bolognese Classique",
            subtitle: "Une recette traditionnelle italienne",
            cookingTime: "45 min",
            difficulty: "Moyen",
            servings: 4,
            ingredients: [
                { name: "Spaghetti", quantity: "400", unit: "g" },
                { name: "Viande hachée de bœuf", quantity: "300", unit: "g" },
                { name: "Tomates concassées", quantity: "400", unit: "ml" },
                { name: "Oignon", quantity: "1", unit: "pièce" },
                { name: "Ail", quantity: "2", unit: "gousses" },
                { name: "Huile d'olive", quantity: "2", unit: "c. à soupe" },
                { name: "Parmesan râpé", quantity: "50", unit: "g" }
            ],
            instructions: [
                "Faire chauffer l'huile d'olive dans une grande poêle",
                "Faire revenir l'oignon et l'ail émincés pendant 3 minutes",
                "Ajouter la viande hachée et faire cuire jusqu'à ce qu'elle soit dorée",
                "Incorporer les tomates concassées et laisser mijoter 20 minutes",
                "Pendant ce temps, faire cuire les spaghetti selon les instructions",
                "Égoutter les pâtes et les mélanger avec la sauce",
                "Servir avec le parmesan râpé"
            ],
            nutritionalInfo: {
                calories: 520,
                carbs: "55g",
                protein: "28g",
                fat: "18g"
            },
            allergens: ["Gluten", "Lactose"],
            tags: ["Italien", "Pâtes", "Viande"]
        },
        {
            title: "Salade de Quinoa aux Légumes",
            subtitle: "Fraîche et nutritive",
            cookingTime: "25 min",
            difficulty: "Facile",
            servings: 2,
            ingredients: [
                { name: "Quinoa", quantity: "150", unit: "g" },
                { name: "Courgette", quantity: "1", unit: "pièce" },
                { name: "Tomates cerises", quantity: "200", unit: "g" },
                { name: "Feta", quantity: "100", unit: "g" },
                { name: "Concombre", quantity: "1", unit: "pièce" },
                { name: "Huile d'olive", quantity: "3", unit: "c. à soupe" },
                { name: "Citron", quantity: "1", unit: "pièce" }
            ],
            instructions: [
                "Rincer le quinoa et le faire cuire dans l'eau bouillante pendant 15 minutes",
                "Couper la courgette en dés et la faire griller",
                "Couper les tomates cerises en deux",
                "Éplucher et couper le concombre en dés",
                "Émietter la feta",
                "Mélanger tous les ingrédients dans un saladier",
                "Assaisonner avec l'huile d'olive et le jus de citron"
            ],
            nutritionalInfo: {
                calories: 380,
                carbs: "42g",
                protein: "16g",
                fat: "15g"
            },
            allergens: ["Lactose"],
            tags: ["Végétarien", "Salade", "Quinoa", "Santé"]
        },
        {
            title: "Poulet Teriyaki aux Légumes",
            subtitle: "Inspiration japonaise",
            cookingTime: "30 min",
            difficulty: "Facile",
            servings: 2,
            ingredients: [
                { name: "Filets de poulet", quantity: "300", unit: "g" },
                { name: "Brocolis", quantity: "200", unit: "g" },
                { name: "Poivron rouge", quantity: "1", unit: "pièce" },
                { name: "Sauce teriyaki", quantity: "60", unit: "ml" },
                { name: "Riz basmati", quantity: "150", unit: "g" },
                { name: "Huile de sésame", quantity: "1", unit: "c. à soupe" },
                { name: "Graines de sésame", quantity: "1", unit: "c. à soupe" }
            ],
            instructions: [
                "Faire cuire le riz selon les instructions",
                "Couper le poulet en lamelles",
                "Faire chauffer l'huile de sésame dans un wok",
                "Faire revenir le poulet pendant 5 minutes",
                "Ajouter les brocolis et le poivron coupés",
                "Verser la sauce teriyaki et faire sauter 5 minutes",
                "Servir sur le riz avec les graines de sésame"
            ],
            nutritionalInfo: {
                calories: 450,
                carbs: "48g",
                protein: "32g",
                fat: "12g"
            },
            allergens: ["Soja", "Sésame"],
            tags: ["Japonais", "Poulet", "Riz", "Wok"]
        }
    ];

    private responseIndex = 0;

    static create(): OpenAIMock {
        return new OpenAIMock();
    }

    // Mock the chat.completions.create method
    chat = {
        completions: {
            create: async (request: OpenAIChatCompletionRequest): Promise<MockedOpenAIResponse> => {
                return this.createMockResponse(request);
            }
        }
    };

    private createMockResponse(request: OpenAIChatCompletionRequest): MockedOpenAIResponse {
        // Simulate processing delay
        const delay = Math.random() * 2000 + 1000; // 1-3 seconds
        
        // Get next recipe template (cycle through them)
        const template = OpenAIMock.recipeTemplates[this.responseIndex % OpenAIMock.recipeTemplates.length];
        this.responseIndex++;

        // Create realistic response
        const response: MockedOpenAIResponse = {
            id: `chatcmpl-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: JSON.stringify(template, null, 2)
                    },
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: this.calculatePromptTokens(request),
                completion_tokens: this.calculateCompletionTokens(template),
                total_tokens: 0
            }
        };

        response.usage.total_tokens = response.usage.prompt_tokens + response.usage.completion_tokens;

        return new Promise(resolve => {
            setTimeout(() => resolve(response), delay);
        }) as any;
    }

    private calculatePromptTokens(request: OpenAIChatCompletionRequest): number {
        // Rough estimation based on message content
        let tokens = 0;
        
        for (const message of request.messages) {
            if (typeof message.content === 'string') {
                tokens += Math.ceil(message.content.length / 4); // ~4 chars per token
            } else if (Array.isArray(message.content)) {
                for (const part of message.content) {
                    if (part.type === 'text') {
                        tokens += Math.ceil(part.text.length / 4);
                    } else if (part.type === 'image_url') {
                        tokens += 765; // Base image tokens for high detail
                    }
                }
            }
        }
        
        return tokens;
    }

    private calculateCompletionTokens(template: any): number {
        // Rough estimation based on response size
        const jsonString = JSON.stringify(template);
        return Math.ceil(jsonString.length / 4);
    }

    // Method to simulate API errors for testing error handling
    simulateError(errorType: 'rate_limit' | 'quota_exceeded' | 'api_key' | 'network'): void {
        const originalCreate = this.chat.completions.create;
        
        this.chat.completions.create = async (): Promise<never> => {
            const errors = {
                rate_limit: {
                    error: {
                        message: 'Rate limit reached. Please slow down.',
                        type: 'requests',
                        param: null,
                        code: 'rate_limit_exceeded'
                    }
                },
                quota_exceeded: {
                    error: {
                        message: 'You exceeded your current quota, please check your plan and billing details.',
                        type: 'insufficient_quota',
                        param: null,
                        code: 'insufficient_quota'
                    }
                },
                api_key: new Error('Invalid API key provided'),
                network: new Error('Network error: Connection timeout')
            };

            throw errors[errorType];
        };

        // Restore after first call
        setTimeout(() => {
            this.chat.completions.create = originalCreate;
        }, 0);
    }

    // Reset response index for consistent testing
    reset(): void {
        this.responseIndex = 0;
    }
}

export default OpenAIMock;