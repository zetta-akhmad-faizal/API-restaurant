const { mongoose } = require('mongoose');
const {transactionModel} = require('./transaction.model');
const {validateStockIngredient} = require('./transaction.app')

//employer side
const GetAllTransaction = async(parent,{data: {limit, page,last_name_user, recipe_name, order_status, order_date}}, ctx) => {
    let arr = [];
    if(last_name_user){
        last_name_user = new RegExp(last_name_user, 'i');
    }

    if(last_name_user && recipe_name){
        last_name_user = new RegExp(last_name_user, 'i');
        recipe_name = new RegExp(recipe_name, 'i');
    }

    if(recipe_name){
        recipe_name = new RegExp(recipe_name, 'i');
    }

    let usersLookup = {
        $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'users'
        }
    }

    let recipesLookup = {
        $lookup: {
            from: 'recipes',
            localField: 'menu.recipe_id',
            foreignField: '_id',
            as: 'recipes'
        }
    }

    let skip = page > 0 ? ((page-1)*limit):0;
    if(limit && page && !last_name_user && !recipe_name && !order_status && !order_date){
        arr.push(
            {
                $match: {
                    status: "Active"
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        )
    }else if(limit && page && last_name_user && !recipe_name && !order_status && !order_date){
        arr.push(
            usersLookup,
            {
                $match: {
                    status: 'Active',
                    'users.last_name': last_name_user
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        )
    }else if(limit && page && !last_name_user && recipe_name && !order_status && !order_date){
        arr.push(
            recipesLookup,
            {
                $match: {
                    status: 'Active',
                    'recipes.recipe_name': recipe_name
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        )
    }else if(limit && page && !last_name_user && !recipe_name && order_status && !order_date){
        arr.push(
            {
                $match: {
                    status: "Active",
                    order_status
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit
            }
        )
    }else if(limit && page && !last_name_user && !recipe_name && !order_status && order_date){
        arr.push(
            {
                $match: {
                    status: "Active",
                    order_date
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit
            }
        )
    }else if(limit && page && last_name_user && recipe_name && !order_status && !order_date){
        arr.push(
            usersLookup,
            recipesLookup,
            {
                $match: {
                    status: 'Active',
                    'users.last_name': last_name_user,
                    'recipes.recipe_name': recipe_name
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit
            }
        )
    }else if(limit && page && last_name_user && recipe_name && order_status && !order_date){
        arr.push(
            usersLookup,
            recipesLookup,
            {
                $match: {
                    status: 'Active',
                    'users.last_name': last_name_user,
                    'recipes.recipe_name': recipe_name,
                    order_status
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit
            }
        )
    }else if(limit && page && last_name_user && recipe_name && order_status && order_date){
        arr.push(
            usersLookup,
            recipesLookup,
            {
                $match: {
                    status: 'Active',
                    'users.last_name': last_name_user,
                    'recipes.recipe_name': recipe_name,
                    order_status,
                    order_date
                }
            },
            {
                $skip: skip,
            },
            {
                $limit: limit
            }
        )
    }else if(!limit && !page && !last_name_user && !recipe_name && !order_status && !order_date){
        arr.push(
            {
                $match: {
                    status: "Active"
                }
            },
            {
                $sort: {
                    order_date: -1
                }
            }
        )
    }

    let queriesGetAll = await transactionModel.aggregate(arr);
    if(!queriesGetAll){
        return {message: "No transaction show"}
    }

    return {message: "Transaction is displayed", data: queriesGetAll}
}

//employer side
const GetOneTransaction = async(parent, {data: {_id}}, ctx) => {
    if(!_id){
        return {message: "_id is null"}
    }

    const querieGetOne = await transactionModel.findOne({_id: mongoose.Types.ObjectId(_id), status: "Active"});
    if(!querieGetOne){
        return {message: "No transaction show", data:querieGetOne}
    }

    return {message: "Transaction is available", data: querieGetOne}
}

const testM = async(parent, args, ctx) => {
    return 'mutation'
}

const CreateTransaction = async(parent, {data:{menu}}, ctx) => {
    if(!menu){
        return {message: "Transaction isn't created"}
    }
    
    let obj = {
        user_id: ctx.user._id,
        menu,
        order_date: new Date(),
    }

    let arr = []
    for(let indexOfMenu of menu){
        let validateStock = await validateStockIngredient(indexOfMenu.recipe_id, indexOfMenu.amount)
        //get value from function validate
        arr.push(validateStock);
    }
    //validate 
    let validateValue = arr.includes(true)
    if(validateValue === false){
        obj['order_status'] = 'Success'
        let queriesInsert = new transactionModel(obj);
        await queriesInsert.save();
        return {message: "Transaction success", data: obj}
    }else{
        obj['order_status'] = 'Failed'
        let queriesInsert = new transactionModel(obj);
        await queriesInsert.save();
        return {message: "Transaction success", data: obj}
    }
}

module.exports = {
    Query:{
        GetAllTransaction,
        GetOneTransaction,
    },
    Mutation: {
        testM,
        CreateTransaction
    }
}