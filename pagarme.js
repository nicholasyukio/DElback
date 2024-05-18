const createOrder = (name, email) => {
    const pagarme_api_key = process.env.PAGARME_KEY
    const data = {
        items: [
        {
            amount: 50800,
            description: "Curso Domínio Elétrico",
            quantity: 1
        }
        ],
        customer: {
        name: name,
        email: email
        },
        payments: [
        {
            payment_method: "checkout",
            amount: 28000,
            checkout: {
            customer_editable: true,
            skip_checkout_success_page: true,
            accepted_payment_methods: ["credit_card", "boleto", "pix"],
            success_url: "https://www.pagar.me",
            boleto: {
                bank: "033",
                instructions: "Pagar ate o vencimento",
                due_at: "2024-05-25T00:00:00Z"
            },
            credit_card: {
                capture: true,
                statement_descriptor: "Desc na fatura",
                installments: [
                {
                    number: 1,
                    total: 28000
                },
                {
                    number: 2,
                    total: 28000
                }
                ]
            },
            pix: {
                expires_in: 100000
            }
            }
        }
        ]
    };
    const options = {
        method: 'POST',
        headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${pagarme_api_key}`
        },
        body: JSON.stringify(data)
    };
    
    fetch('https://api.pagar.me/core/v5/orders', options)
    .then(response => {
        console.log(response);
        const paymentUrl = response.checkouts[0].payment_url;
        console.log(paymentUrl); // Log the payment_url value
        return paymentUrl; // Optional: Return the payment_url for potential further use
    })
    .catch(err => console.error(err));

}

export {createOrder};

